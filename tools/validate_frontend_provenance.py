#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

KEYS = {"schema_version", "source_repository", "source_sha", "source_ref", "image_repository", "image_tag", "image_digest", "config_fingerprint", "workflow_run_id", "workflow_run_attempt"}
TAG = re.compile(r"([0-9a-f]{40})-cfg-([0-9a-f]{20})-run-([1-9][0-9]*)-a([1-9][0-9]*)")
DIGEST = re.compile(r"sha256:[0-9a-f]{64}")

def main() -> int:
    value = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    assert isinstance(value, dict) and set(value) == KEYS
    assert type(value["schema_version"]) is int and value["schema_version"] == 1 and type(value["workflow_run_id"]) is int and type(value["workflow_run_attempt"]) is int
    assert value["workflow_run_id"] > 0 and value["workflow_run_attempt"] > 0
    assert all(type(value[k]) is str for k in KEYS - {"schema_version", "workflow_run_id", "workflow_run_attempt"})
    assert value["source_repository"] == "Team-PinLog/front" and value["source_ref"] == "dev"
    assert value["image_repository"] == "ghcr.io/team-pinlog/front" and DIGEST.fullmatch(value["image_digest"])
    match = TAG.fullmatch(value["image_tag"])
    assert match and len(value["image_tag"]) <= 128
    assert match.groups() == (value["source_sha"], value["config_fingerprint"], str(value["workflow_run_id"]), str(value["workflow_run_attempt"]))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
