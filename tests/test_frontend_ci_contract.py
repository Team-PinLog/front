import re
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
RUNTIME_CONTRACT = ROOT / ".github" / "pinlog" / "runtime-config.dev.yaml"

FULL_SHA = re.compile(r"^[^@]+@[0-9a-f]{40}$")
IMAGE = "ghcr.io/team-pinlog/front"
BASE_IMAGE = (
    "nginx:1.29.1-alpine@"
    "sha256:42a516af16b852e33b7682d5ef8acbd5d13fe08fecadc7ed98605ba5e3b26ab8"
)
IMAGE_DOCKERFILE = ROOT / "infra" / "frontend-image" / "Dockerfile"
NGINX_CONFIG = ROOT / "infra" / "frontend-image" / "nginx.conf"
RUNTIME_DOC = ROOT / "docs" / "frontend-image-runtime-contract.md"
ENV_EXAMPLE = ROOT / ".env.example"


def load_workflow():
    return yaml.load(WORKFLOW.read_text(), Loader=yaml.BaseLoader)


def named_step(job, name):
    matches = [step for step in job["steps"] if step.get("name") == name]
    if len(matches) != 1:
        raise AssertionError(f"expected one step named {name!r}, found {len(matches)}")
    return matches[0]


class FrontendImageWorkflowContractTests(unittest.TestCase):
    def setUp(self):
        self.workflow = load_workflow()
        self.jobs = self.workflow["jobs"]

    def test_ci_runs_for_dev_pull_requests_and_dev_pushes_with_read_only_default(self):
        self.assertEqual(
            self.workflow["on"],
            {
                "pull_request": {"branches": ["dev", "main"]},
                "push": {"branches": ["dev"]},
                "workflow_dispatch": "",
            },
        )
        self.assertEqual(self.workflow["permissions"], {"contents": "read"})

    def test_build_injects_and_asserts_the_non_empty_api_base_url(self):
        check = self.jobs["check"]
        for step_name in (
            "Build frontend with dev repository secrets",
            "Build frontend with pull request placeholders",
        ):
            build = named_step(check, step_name)
            self.assertIn(': "${VITE_API_BASE_URL:?', build["run"])
            self.assertIn("npm run build", build["run"])
            self.assertIn("grep", build["run"])
            self.assertIn("dist", build["run"])

    def test_runtime_config_contract_classifies_all_vite_inputs_as_public(self):
        contract = yaml.safe_load(RUNTIME_CONTRACT.read_text())

        self.assertEqual(contract["apiVersion"], "pinlog.io/v1alpha1")
        self.assertEqual(contract["kind"], "RuntimeConfigContract")
        self.assertEqual(contract["metadata"]["name"], "front-dev")
        spec = contract["spec"]
        self.assertEqual(spec["service"], "front")
        self.assertEqual(spec["environment"], "dev")
        self.assertEqual(
            spec["source"],
            {"repository": "Team-PinLog/front", "baseRef": "refs/heads/dev"},
        )
        self.assertEqual(
            spec["publicVariables"],
            [
                "VITE_API_BASE_URL",
                "VITE_KAKAO_REST_KEY",
                "VITE_KAKAO_JS_KEY",
            ],
        )
        self.assertEqual(spec["ownerSecretKeys"], [])
        self.assertEqual(spec["infraOwnedKeys"], [])
        self.assertEqual(
            spec["target"],
            {"namespace": "pinlog-dev", "name": "front-runtime-config"},
        )
        self.assertEqual(spec["rollout"]["mode"], "image-rebuild")

    def test_dev_push_build_uses_repository_actions_secrets(self):
        check = self.jobs["check"]
        build = named_step(check, "Build frontend with dev repository secrets")
        self.assertEqual(
            build["if"],
            "${{ github.event_name != 'pull_request' && github.ref == 'refs/heads/dev' }}",
        )
        self.assertEqual(
            build["env"],
            {
                "VITE_API_BASE_URL": "${{ secrets.VITE_API_BASE_URL }}",
                "VITE_KAKAO_REST_KEY": "${{ secrets.VITE_KAKAO_REST_KEY }}",
                "VITE_KAKAO_JS_KEY": "${{ secrets.VITE_KAKAO_JS_KEY }}",
            },
        )
        for name in build["env"]:
            self.assertIn(f': "${{{name}:?', build["run"])
        self.assertNotRegex(build["run"], r"(?m)^\s*(?:echo|printf).*\$VITE_")

    def test_pull_request_build_uses_value_free_public_placeholders(self):
        check = self.jobs["check"]
        placeholders = named_step(check, "Build frontend with pull request placeholders")
        self.assertEqual(placeholders["if"], "${{ github.event_name == 'pull_request' }}")
        self.assertNotIn("secrets.", yaml.safe_dump(placeholders))
        for variable, placeholder in {
            "VITE_API_BASE_URL": "/api/core/v1",
            "VITE_KAKAO_REST_KEY": "ci-public-rest-key",
            "VITE_KAKAO_JS_KEY": "ci-public-js-key",
        }.items():
            self.assertEqual(placeholders["env"][variable], placeholder)

    def test_runtime_docs_do_not_describe_browser_exposed_vite_values_as_secrets(self):
        runtime_doc = RUNTIME_DOC.read_text()
        env_example = ENV_EXAMPLE.read_text()

        for variable in (
            "VITE_API_BASE_URL",
            "VITE_KAKAO_REST_KEY",
            "VITE_KAKAO_JS_KEY",
        ):
            self.assertIn(variable, runtime_doc)
            self.assertIn(variable, env_example)
        self.assertIn("repository-level GitHub Actions Secrets", runtime_doc)
        self.assertIn("browser bundle", runtime_doc)
        self.assertIn("CI log", runtime_doc)
        self.assertIn("automatic masking", runtime_doc)
        self.assertIn("ownerSecretKeys: []", runtime_doc)
        self.assertIn("no sealing or dispatch action/job is invoked", runtime_doc)
        self.assertIn("public build configuration", env_example)

    def test_image_recipe_runs_as_uid_101_without_linux_capabilities(self):
        dockerfile = IMAGE_DOCKERFILE.read_text()
        nginx = NGINX_CONFIG.read_text()

        self.assertIn(f"FROM {BASE_IMAGE}", dockerfile)
        self.assertIn('ENTRYPOINT ["nginx", "-g", "daemon off;"]', dockerfile)
        self.assertIn("pid /tmp/nginx.pid;", nginx)
        for temp_path in (
            "client_body_temp_path /tmp/client_temp;",
            "proxy_temp_path /tmp/proxy_temp;",
            "fastcgi_temp_path /tmp/fastcgi_temp;",
            "uwsgi_temp_path /tmp/uwsgi_temp;",
            "scgi_temp_path /tmp/scgi_temp;",
        ):
            self.assertIn(temp_path, nginx)
        self.assertIn("listen 8080;", nginx)
        self.assertNotRegex(nginx, r"(?m)^\s*listen\s+80\s*;")

    def test_healthz_is_exact_and_api_paths_do_not_use_spa_fallback(self):
        nginx = NGINX_CONFIG.read_text()
        self.assertRegex(nginx, r"location\s*=\s*/healthz\s*\{")
        self.assertRegex(nginx, r"location\s+\^~\s+/api/\s*\{")
        self.assertIn("return 404;", nginx)
        self.assertIn("try_files $uri $uri/ /index.html;", nginx)

    def test_checked_build_produces_smokes_and_uploads_the_exact_container_artifact(self):
        self.assertIn("check", self.jobs)
        check = self.jobs["check"]
        self.assertEqual(check["name"], "frontend-ci / check")
        commands = "\n".join(
            step.get("run", "") for step in check["steps"] if "run" in step
        )
        for command in (
            "npm ci",
            "npm run lint",
            "npm run typecheck",
            "npm run test",
            "python3 -m unittest -v tests.test_frontend_ci_contract",
        ):
            self.assertIn(command, commands)

        recipe = named_step(check, "Create immutable frontend image recipe")["run"]
        self.assertIn("infra/frontend-image/Dockerfile", recipe)
        self.assertIn("infra/frontend-image/nginx.conf", recipe)
        self.assertIn("cp -R dist", recipe)

        validate = named_step(check, "Validate frontend container image")
        self.assertEqual(validate["with"]["push"], "false")
        self.assertEqual(validate["with"]["load"], "true")
        self.assertEqual(validate["with"]["context"], ".ci-image/context")
        self.assertEqual(
            validate["with"]["file"], ".ci-image/context/Dockerfile"
        )
        self.assertEqual(validate["with"]["tags"], "pinlog-front:ci-${{ github.sha }}")

        smoke = named_step(check, "Smoke test frontend container security contract")
        for contract in (
            "--user 101:101",
            "--cap-drop ALL",
            "no-new-privileges",
            "--read-only",
            "--tmpfs /tmp:",
            "/healthz",
            "/spa-route",
            "/api/core/v1/healthz",
        ):
            self.assertIn(contract, smoke["run"])

        artifact = named_step(check, "Upload validated frontend image context")
        self.assertEqual(artifact["with"]["name"], "frontend-image-${{ github.sha }}")
        self.assertEqual(
            artifact["with"]["path"], ".ci-image/context/"
        )
        self.assertEqual(artifact["with"]["if-no-files-found"], "error")
        self.assertEqual(artifact["with"].get("include-hidden-files"), "true")

    def test_publish_is_gated_on_successful_dev_push_and_has_minimal_write_permission(self):
        self.assertIn("image-publish", self.jobs)
        publish = self.jobs["image-publish"]
        self.assertEqual(publish["name"], "frontend-image / publish")
        self.assertEqual(publish["needs"], "check")
        self.assertEqual(
            publish["if"],
            "${{ (github.event_name == 'push' || github.event_name == 'workflow_dispatch') && github.ref == 'refs/heads/dev' }}",
        )
        self.assertEqual(
            publish["permissions"], {"contents": "read", "packages": "write"}
        )
        self.assertEqual(
            self.workflow["concurrency"]["cancel-in-progress"],
            "${{ github.event_name == 'pull_request' }}",
        )
        download = named_step(publish, "Download validated frontend image context")
        self.assertEqual(download["with"]["name"], "frontend-image-${{ github.sha }}")

    def test_publish_checks_out_validator_before_downloading_image_context(self):
        publish = self.jobs["image-publish"]
        checkout = publish["steps"][0]
        self.assertEqual(
            checkout["uses"],
            "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
        )
        self.assertEqual(checkout["with"], {"persist-credentials": "false"})
        names = [step.get("name") for step in publish["steps"]]
        self.assertLess(0, names.index("Download validated frontend image context"))
        verify = named_step(publish, "Verify immutable image and write provenance")
        self.assertIn(
            "python3 tools/validate_frontend_provenance.py",
            verify["run"],
        )

    def test_publish_has_no_registry_preflight_or_tag_reuse(self):
        publish = self.jobs["image-publish"]
        identity = named_step(publish, "Resolve run-bound immutable image identity")
        script = identity["run"]
        workflow_text = WORKFLOW.read_text()
        self.assertNotIn("ghcr.io/token", script)
        self.assertNotIn("manifests/", script)
        self.assertNotIn("reused", workflow_text)
        self.assertNotIn("Bearer ***", workflow_text)
        self.assertIn("-run-${GITHUB_RUN_ID}-a${GITHUB_RUN_ATTEMPT}", script)

    def test_publish_uses_composite_tag_and_verifies_returned_digest(self):
        publish = self.jobs["image-publish"]
        build = named_step(publish, "Build and publish run-bound immutable frontend image")
        self.assertEqual(build["with"]["push"], "true")
        self.assertEqual(build["with"]["tags"], f"{IMAGE}:${{{{ steps.identity.outputs.image_tag }}}}")
        self.assertEqual(build["with"]["context"], ".ci-image/context")
        verify = named_step(publish, "Verify immutable image and write provenance")
        command = verify["run"]
        self.assertIn('test "$RESOLVED_DIGEST" = "$IMAGE_DIGEST"', command)
        self.assertIn(f'docker buildx imagetools inspect "{IMAGE}@${{IMAGE_DIGEST}}"', command)
        self.assertIn('echo "Verified image: $IMAGE_TAG@$IMAGE_DIGEST"', command)

    def test_successful_publish_dispatches_the_trusted_infra_updater(self):
        publish = self.jobs["image-publish"]
        dispatch = named_step(publish, "Request trusted Infra image promotion")
        self.assertEqual(dispatch["continue-on-error"], "true")
        self.assertEqual(
            dispatch["env"],
            {"GH_TOKEN": "${{ secrets.PINLOG_INFRA_IMAGE_PR_TOKEN }}"},
        )
        command = dispatch["run"]
        self.assertIn('test -n "$GH_TOKEN"', command)
        self.assertIn(
            "gh workflow run frontend-image-update.yaml \\",
            command,
        )
        self.assertIn("--repo Team-PinLog/infra", command)
        self.assertIn("--ref main", command)
        self.assertNotIn("IMAGE_DIGEST", command)
        self.assertNotIn("pull request", command.lower())

    def test_manual_publish_requires_canary_revision_in_config_fingerprint_only(self):
        publish = self.jobs["image-publish"]
        self.assertEqual(publish.get("environment"), "dev")
        identity = named_step(publish, "Resolve run-bound immutable image identity")
        self.assertEqual(
            identity["env"],
            {
                "VITE_API_BASE_URL": "${{ secrets.VITE_API_BASE_URL }}",
                "VITE_KAKAO_REST_KEY": "${{ secrets.VITE_KAKAO_REST_KEY }}",
                "VITE_KAKAO_JS_KEY": "${{ secrets.VITE_KAKAO_JS_KEY }}",
                "DEPLOY_CANARY_REV": "${{ secrets.DEPLOY_CANARY_REV }}",
            },
        )
        self.assertIn(': "${DEPLOY_CANARY_REV:?missing variable}"', identity["run"])
        self.assertIn(
            'names = ("VITE_API_BASE_URL", "VITE_KAKAO_REST_KEY", '
            '"VITE_KAKAO_JS_KEY", "DEPLOY_CANARY_REV")',
            identity["run"],
        )
        self.assertIn('[[ "$DEPLOY_CANARY_REV" =~ ^[A-Za-z0-9._-]+$ ]]', identity["run"])

        check = self.jobs["check"]
        for step_name in (
            "Build frontend with dev repository secrets",
            "Build frontend with pull request placeholders",
        ):
            build = named_step(check, step_name)
            self.assertNotIn("DEPLOY_CANARY_REV", build.get("env", {}))
            self.assertNotIn("DEPLOY_CANARY_REV", build["run"])
        contract = yaml.safe_load(RUNTIME_CONTRACT.read_text())
        self.assertNotIn("DEPLOY_CANARY_REV", contract["spec"]["publicVariables"])
        self.assertNotIn("DEPLOY_CANARY_REV", RUNTIME_CONTRACT.read_text())

    def test_build_inputs_never_use_vars_api_or_local_action(self):
        workflow_text = WORKFLOW.read_text()
        self.assertNotIn("${{ vars.", workflow_text)
        self.assertNotIn("actions/variables/", workflow_text)
        self.assertNotIn("./.github/actions/load-masked-build-vars", workflow_text)
        self.assertFalse((ROOT / ".github" / "actions" / "load-masked-build-vars").exists())

    def test_manual_composite_publish_contract(self):
        check = self.jobs["check"]
        guard = named_step(check, "Guard manual dispatch at current dev HEAD")
        self.assertIn("github.event_name == 'workflow_dispatch'", guard["if"])
        self.assertIn("git/ref/heads/dev", guard["run"])
        self.assertIn('test "$dev_sha" = "$GITHUB_SHA"', guard["run"])

        publish = self.jobs["image-publish"]
        identity = named_step(publish, "Resolve run-bound immutable image identity")
        script = identity["run"]
        for contract in ("sha256sum", "VITE_API_BASE_URL", "VITE_KAKAO_REST_KEY", "VITE_KAKAO_JS_KEY", "DEPLOY_CANARY_REV", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT", "IMAGE_TAG"):
            self.assertIn(contract, script)
        self.assertNotIn('echo "$VITE_', script)
        self.assertNotIn('echo "$DEPLOY_CANARY_REV', script)
        build = named_step(publish, "Build and publish run-bound immutable frontend image")
        self.assertIn("steps.identity.outputs.image_tag", build["with"]["tags"])
        verify = named_step(publish, "Verify immutable image and write provenance")
        for key in ("schema_version", "source_repository", "source_sha", "source_ref", "image_repository", "image_tag", "image_digest", "config_fingerprint", "workflow_run_id", "workflow_run_attempt"):
            self.assertIn(key, verify["run"])
        self.assertIn("tools/validate_frontend_provenance.py", verify["run"])
        names = [step.get("name") for step in publish["steps"]]
        self.assertLess(names.index("Upload run-bound image provenance"), names.index("Request trusted Infra image promotion"))
        artifact = named_step(publish, "Upload run-bound image provenance")
        self.assertEqual(artifact["with"]["name"], "frontend-image-provenance")

    def test_all_third_party_actions_are_pinned_to_full_commit_shas(self):
        for job_name, job in self.jobs.items():
            for step in job["steps"]:
                if "uses" in step and not step["uses"].startswith("./"):
                    with self.subTest(job=job_name, action=step["uses"]):
                        self.assertRegex(step["uses"], FULL_SHA)


if __name__ == "__main__":
    unittest.main()
