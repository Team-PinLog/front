import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "validate_frontend_provenance.py"
SHA = "a" * 40
FP = "b" * 20


def valid_provenance():
    return {
        "schema_version": 1,
        "source_repository": "Team-PinLog/front",
        "source_sha": SHA,
        "source_ref": "dev",
        "image_repository": "ghcr.io/team-pinlog/front",
        "image_tag": f"{SHA}-cfg-{FP}-run-123-a2",
        "image_digest": "sha256:" + "c" * 64,
        "config_fingerprint": FP,
        "workflow_run_id": 123,
        "workflow_run_attempt": 2,
    }


class ProvenanceSchemaTypes(unittest.TestCase):
    def validate(self, value):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "provenance.json"
            path.write_text(json.dumps(value), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(TOOL), str(path)], capture_output=True, text=True
            )

    def test_accepts_integer_schema_version_one(self):
        self.assertEqual(self.validate(valid_provenance()).returncode, 0)

    def test_rejects_non_exact_integer_schema_versions(self):
        for schema_version in (True, False, 1.0, "1"):
            value = valid_provenance()
            value["schema_version"] = schema_version
            with self.subTest(schema_version=schema_version):
                self.assertNotEqual(self.validate(value).returncode, 0)

    def test_rejects_boolean_workflow_run_numbers(self):
        for key in ("workflow_run_id", "workflow_run_attempt"):
            value = valid_provenance()
            value[key] = True
            with self.subTest(key=key):
                self.assertNotEqual(self.validate(value).returncode, 0)


if __name__ == "__main__":
    unittest.main()
