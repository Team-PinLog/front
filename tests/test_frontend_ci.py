import copy
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / ".github" / "scripts" / "check_frontend_project.py"
WORKFLOW = ROOT / ".github" / "workflows" / "frontend-ci.yml"


class FrontendProjectContractTests(unittest.TestCase):
    def run_checker(self, files: dict[str, str] | None = None, directories: tuple[str, ...] = ()):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp)
            for directory in directories:
                (project / directory).mkdir(parents=True)
            for relative_path, content in (files or {}).items():
                path = project / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
            return subprocess.run(
                [sys.executable, str(CHECKER), str(project)],
                text=True,
                capture_output=True,
                check=False,
            )

    def test_repository_without_application_source_is_allowed(self):
        result = self.run_checker({"README.md": "# PinLog Frontend\n"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "has_app=false")

    def test_source_without_package_manifest_is_rejected(self):
        result = self.run_checker(directories=("src",))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("package.json", result.stderr)

    def test_package_manifest_without_lockfile_is_rejected(self):
        result = self.run_checker({"package.json": "{}\n"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("package-lock.json", result.stderr)

    def test_npm_project_with_lockfile_is_detected(self):
        result = self.run_checker(
            {"package.json": "{}\n", "package-lock.json": "{}\n"}
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "has_app=true")

    def test_nonexistent_project_root_is_rejected(self):
        result = subprocess.run(
            [sys.executable, str(CHECKER), "/definitely/missing/pinlog-front"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("directory", result.stderr)

    def test_regular_file_project_root_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root_file = Path(tmp) / "not-a-directory"
            root_file.write_text("x")
            result = subprocess.run(
                [sys.executable, str(CHECKER), str(root_file)],
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("directory", result.stderr)

    def test_manifest_directory_is_rejected(self):
        result = self.run_checker(
            {"package-lock.json": "{}\n"}, directories=("package.json",)
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("regular file", result.stderr)

    def test_broken_manifest_symlinks_are_rejected(self):
        for manifest_name in ("package.json", "package-lock.json"):
            with self.subTest(manifest_name=manifest_name):
                with tempfile.TemporaryDirectory() as tmp:
                    project = Path(tmp)
                    (project / manifest_name).symlink_to("missing-target")
                    result = subprocess.run(
                        [sys.executable, str(CHECKER), str(project)],
                        text=True,
                        capture_output=True,
                        check=False,
                    )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("regular file", result.stderr)

    def test_requires_exactly_one_project_root_argument(self):
        result = subprocess.run(
            [sys.executable, str(CHECKER)],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("usage", result.stderr.lower())


class FrontendWorkflowContractTests(unittest.TestCase):
    CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"
    SETUP_PYTHON = "actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97"
    SETUP_NODE = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020"
    APP_CONDITION = "steps.frontend.outputs.has_app == 'true'"

    def expected_workflow(self):
        return {
            "name": "frontend-ci",
            "on": {
                "pull_request": {"branches": ["dev"]},
                "push": {"branches": ["dev"]},
            },
            "permissions": {"contents": "read"},
            "concurrency": {
                "group": "frontend-ci-${{ github.workflow }}-${{ github.ref }}",
                "cancel-in-progress": "true",
            },
            "jobs": {
                "check": {
                    "name": "frontend-ci / check",
                    "runs-on": "ubuntu-latest",
                    "timeout-minutes": "15",
                    "steps": [
                        {
                            "name": "Checkout repository",
                            "uses": self.CHECKOUT,
                            "with": {"persist-credentials": "false"},
                        },
                        {
                            "name": "Set up Python",
                            "uses": self.SETUP_PYTHON,
                            "with": {"python-version": "3.12"},
                        },
                        {
                            "name": "Install CI validator dependencies",
                            "run": "python3 -m pip install --require-hashes -r .github/requirements-ci.txt",
                        },
                        {
                            "name": "Test CI contract",
                            "run": "python3 -m unittest discover -s tests -v",
                        },
                        {
                            "name": "Detect and validate frontend project",
                            "id": "frontend",
                            "run": 'python3 .github/scripts/check_frontend_project.py . >> "$GITHUB_OUTPUT"',
                        },
                        {
                            "name": "Set up Node.js",
                            "if": self.APP_CONDITION,
                            "uses": self.SETUP_NODE,
                            "with": {"node-version": "22", "cache": "npm"},
                        },
                        {
                            "name": "Install dependencies",
                            "if": self.APP_CONDITION,
                            "run": "npm ci",
                        },
                        {
                            "name": "Run tests",
                            "if": self.APP_CONDITION,
                            "run": "npm test --if-present",
                        },
                        {
                            "name": "Build frontend",
                            "if": self.APP_CONDITION,
                            "run": "npm run build",
                        },
                        {
                            "name": "Verify Vite build artifact",
                            "if": self.APP_CONDITION,
                            "run": "test -f dist/index.html",
                        },
                    ],
                }
            },
        }

    def assert_workflow_contract(self, document):
        self.assertEqual(document, self.expected_workflow())
        for step in document["jobs"]["check"]["steps"]:
            if "uses" in step:
                self.assertRegex(step["uses"], r"^actions/[^@]+@[0-9a-f]{40}$")

    def test_workflow_enforces_the_frontend_build_contract(self):
        document = yaml.load(WORKFLOW.read_text(), Loader=yaml.BaseLoader)
        self.assert_workflow_contract(document)

    def test_workflow_rejects_security_and_execution_bypasses(self):
        document = yaml.load(WORKFLOW.read_text(), Loader=yaml.BaseLoader)

        def mutate_action_owner(value):
            value["jobs"]["check"]["steps"][1]["uses"] = (
                "attacker/setup-python@" + "a" * 40
            )

        def disable_job(value):
            value["jobs"]["check"]["if"] = "false"

        def ignore_build_failure(value):
            value["jobs"]["check"]["steps"][8]["continue-on-error"] = "true"

        def change_python(value):
            value["jobs"]["check"]["steps"][1]["with"]["python-version"] = "3.13"

        def change_node_cache(value):
            setup_node = value["jobs"]["check"]["steps"][5]
            setup_node["with"] = {"node-version": "18", "cache": "yarn"}

        for name, mutate in (
            ("action owner", mutate_action_owner),
            ("disabled job", disable_job),
            ("ignored build failure", ignore_build_failure),
            ("python version", change_python),
            ("node and cache", change_node_cache),
        ):
            with self.subTest(name=name):
                mutated = copy.deepcopy(document)
                mutate(mutated)
                with self.assertRaises(AssertionError):
                    self.assert_workflow_contract(mutated)


if __name__ == "__main__":
    unittest.main()
