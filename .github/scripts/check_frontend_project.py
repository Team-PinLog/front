#!/usr/bin/env python3
"""Validate whether this repository is ready for npm-based frontend CI."""

from __future__ import annotations

import sys
from pathlib import Path


APP_MARKERS = (
    "src",
    "public",
    "index.html",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.ts",
    "package-lock.json",
)


def main() -> int:
    if len(sys.argv) != 2:
        print(
            "usage: check_frontend_project.py PROJECT_ROOT",
            file=sys.stderr,
        )
        return 2

    project = Path(sys.argv[1]).resolve()
    if not project.is_dir():
        print("project root must be an existing directory", file=sys.stderr)
        return 1

    package_json = project / "package.json"
    package_lock = project / "package-lock.json"

    for manifest in (package_json, package_lock):
        if manifest.is_symlink() or (manifest.exists() and not manifest.is_file()):
            print(f"{manifest.name} must be a regular file", file=sys.stderr)
            return 1

    app_present = package_json.is_file() or any(
        (project / marker).exists() for marker in APP_MARKERS
    )

    if not app_present:
        print("has_app=false")
        return 0

    if not package_json.is_file():
        print(
            "frontend source exists but package.json is missing",
            file=sys.stderr,
        )
        return 1

    if not package_lock.is_file():
        print(
            "package.json exists but package-lock.json is missing; npm ci must be reproducible",
            file=sys.stderr,
        )
        return 1

    print("has_app=true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
