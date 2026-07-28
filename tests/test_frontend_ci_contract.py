import re
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
FULL_SHA = re.compile(r"^[^@]+@[0-9a-f]{40}$")
IMAGE = "ghcr.io/team-pinlog/front"
BASE_IMAGE = (
    "nginx:1.29.1-alpine@"
    "sha256:42a516af16b852e33b7682d5ef8acbd5d13fe08fecadc7ed98605ba5e3b26ab8"
)


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

    def test_checked_build_produces_and_validates_the_exact_container_artifact(self):
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
            "npm run build",
            "npm run test",
            "python3 -m unittest -v tests.test_frontend_ci_contract",
        ):
            self.assertIn(command, commands)

        recipe = named_step(check, "Create immutable frontend image recipe")["run"]
        self.assertIn(f"FROM {BASE_IMAGE}", recipe)
        self.assertIn("COPY dist/ /usr/share/nginx/html/", recipe)
        self.assertIn("COPY default.conf /etc/nginx/conf.d/default.conf", recipe)
        self.assertIn("try_files $uri $uri/ /index.html", recipe)

        validate = named_step(check, "Validate frontend container image")
        self.assertEqual(validate["with"]["push"], "false")
        self.assertEqual(validate["with"]["context"], ".ci-image/context")
        self.assertEqual(
            validate["with"]["file"], ".ci-image/context/Dockerfile"
        )

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

    def test_all_third_party_actions_are_pinned_to_full_commit_shas(self):
        for job_name, job in self.jobs.items():
            for step in job["steps"]:
                if "uses" in step:
                    with self.subTest(job=job_name, action=step["uses"]):
                        self.assertRegex(step["uses"], FULL_SHA)


if __name__ == "__main__":
    unittest.main()
