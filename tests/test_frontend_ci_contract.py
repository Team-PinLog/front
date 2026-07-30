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
            },
        )
        self.assertEqual(self.workflow["permissions"], {"contents": "read"})

    def test_build_injects_and_asserts_the_non_empty_api_base_url(self):
        check = self.jobs["check"]
        expected_api_expression = (
            "${{ github.event_name == 'pull_request' && '/api/core/v1' "
            "|| vars.VITE_API_BASE_URL }}"
        )
        build = named_step(check, "Build frontend")
        self.assertEqual(build["env"]["VITE_API_BASE_URL"], expected_api_expression)
        self.assertIn(': "${VITE_API_BASE_URL:?', build["run"])
        self.assertIn("npm run build", build["run"])

        assertion = named_step(check, "Assert API base URL in dist")
        self.assertEqual(assertion["env"]["VITE_API_BASE_URL"], expected_api_expression)
        self.assertIn(': "${VITE_API_BASE_URL:?', assertion["run"])
        self.assertIn("grep", assertion["run"])
        self.assertIn("dist", assertion["run"])

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

    def test_dev_push_fails_closed_when_public_github_variables_are_missing(self):
        check = self.jobs["check"]
        validation = named_step(check, "Validate dev public build variables")
        self.assertEqual(
            validation["if"],
            "${{ github.event_name == 'push' && github.ref == 'refs/heads/dev' }}",
        )
        self.assertEqual(
            validation["env"],
            {
                "VITE_API_BASE_URL": "${{ vars.VITE_API_BASE_URL }}",
                "VITE_KAKAO_REST_KEY": "${{ vars.VITE_KAKAO_REST_KEY }}",
                "VITE_KAKAO_JS_KEY": "${{ vars.VITE_KAKAO_JS_KEY }}",
            },
        )
        for variable in validation["env"]:
            self.assertIn(f'"${{{variable}:?', validation["run"])

    def test_pull_request_build_uses_value_free_public_placeholders(self):
        check = self.jobs["check"]
        build = named_step(check, "Build frontend")
        for variable, placeholder in {
            "VITE_API_BASE_URL": "/api/core/v1",
            "VITE_KAKAO_REST_KEY": "ci-public-rest-key",
            "VITE_KAKAO_JS_KEY": "ci-public-js-key",
        }.items():
            expression = build["env"][variable]
            self.assertIn("github.event_name == 'pull_request'", expression)
            self.assertIn(placeholder, expression)
            self.assertIn(f"vars.{variable}", expression)

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
        self.assertIn("GitHub Actions Variables", runtime_doc)
        self.assertIn("browser bundle", runtime_doc)
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
            "${{ github.event_name == 'push' && github.ref == 'refs/heads/dev' }}",
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

    def test_publish_refuses_to_overwrite_an_existing_commit_tag(self):
        publish = self.jobs["image-publish"]
        preflight = named_step(publish, "Refuse to overwrite existing commit tag")
        self.assertEqual(
            preflight["env"]["GITHUB_TOKEN"], "${{ secrets.GITHUB_TOKEN }}"
        )
        script = preflight["run"]
        self.assertIn("https://ghcr.io/token", script)
        self.assertIn(
            "https://ghcr.io/v2/team-pinlog/front/manifests/${GITHUB_SHA}",
            script,
        )
        self.assertIn('case "$http_status" in', script)
        self.assertIn("404)", script)
        self.assertIn("200)", script)
        self.assertIn("curl_status", script)
        self.assertNotIn("manifest unknown|not found", script)

    def test_publish_uses_full_commit_sha_tag_and_verifies_returned_digest(self):
        self.assertIn("image-publish", self.jobs)
        publish = self.jobs["image-publish"]
        build = named_step(publish, "Build and publish immutable frontend image")
        self.assertEqual(build["with"]["push"], "true")
        self.assertEqual(build["with"]["tags"], f"{IMAGE}:${{{{ github.sha }}}}")
        self.assertEqual(build["with"]["context"], ".ci-image/context")
        self.assertEqual(build["with"]["file"], ".ci-image/context/Dockerfile")

        verify = named_step(publish, "Verify published image digest")
        self.assertEqual(
            verify["env"], {"IMAGE_DIGEST": "${{ steps.publish.outputs.digest }}"}
        )
        command = verify["run"]
        self.assertIn('test -n "$IMAGE_DIGEST"', command)
        self.assertIn(
            f'inspection=$(docker buildx imagetools inspect "{IMAGE}:${{GITHUB_SHA}}")',
            command,
        )
        self.assertIn('test "$RESOLVED_DIGEST" = "$IMAGE_DIGEST"', command)
        self.assertIn(
            f'docker buildx imagetools inspect "{IMAGE}@${{IMAGE_DIGEST}}"',
            command,
        )
        self.assertIn('echo "Published digest: $IMAGE_DIGEST"', command)

    def test_successful_publish_dispatches_the_trusted_infra_updater(self):
        publish = self.jobs["image-publish"]
        dispatch = named_step(publish, "Request trusted Infra image promotion")
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

    def test_all_third_party_actions_are_pinned_to_full_commit_shas(self):
        for job_name, job in self.jobs.items():
            for step in job["steps"]:
                if "uses" in step:
                    with self.subTest(job=job_name, action=step["uses"]):
                        self.assertRegex(step["uses"], FULL_SHA)


if __name__ == "__main__":
    unittest.main()
