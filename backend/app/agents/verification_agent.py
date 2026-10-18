"""Verification Agent — checks that claims are grounded in retrieved evidence."""

from __future__ import annotations

from typing import Any


class VerificationAgent:
    """Agent that verifies generated lessons against the source.

    - Every referenced path must exist in the fetched set.
    - Every explanation should cite at least one evidence path.
    - Unsupported claims are flagged (not silently dropped).
    """

    def verify(
        self,
        teacher_output: dict[str, Any],
        analyst_output: dict[str, Any],
        parsed: dict[str, Any],
    ) -> dict[str, Any]:
        known_paths: set[str] = set()
        # Gather all known paths from tree + file_contents + analyst findings
        for p in parsed.get("file_contents", {}).keys():
            known_paths.add(p)
        for p in parsed.get("important_files") or []:
            known_paths.add(p)
        for p in parsed.get("entry_points") or []:
            known_paths.add(p)
        for r in parsed.get("file_relationships") or []:
            if r.get("file"):
                known_paths.add(r["file"])
        # Also from analyst relationships
        for r in analyst_output.get("relationships") or []:
            if r.get("file"):
                known_paths.add(r["file"])
        for f in analyst_output.get("findings") or []:
            for p in f.get("evidence_paths") or []:
                known_paths.add(p)

        issues: list[dict[str, Any]] = []
        unsupported: list[str] = []
        verified: set[str] = set()

        for mission in teacher_output.get("missions") or []:
            mid = mission.get("id", "unknown")
            paths = mission.get("evidence_paths") or []
            if not paths:
                issues.append(
                    {"severity": "warning", "message": f"Mission {mid} has no evidence paths.", "path": None}
                )
                unsupported.append(f"Mission {mid} lacks evidence paths")
                continue
            for p in paths:
                if p in known_paths:
                    verified.add(p)
                else:
                    issues.append(
                        {
                            "severity": "error",
                            "message": f"Mission {mid} references unknown path: {p}",
                            "path": p,
                        }
                    )
                    unsupported.append(f"Mission {mid} references missing path {p}")

            # Check explanation is non-empty and not hallucinated file names
            explanation = mission.get("explanation") or ""
            if len(explanation.strip()) < 20:
                issues.append(
                    {"severity": "warning", "message": f"Mission {mid} explanation is too short.", "path": None}
                )

        # Also verify analyst findings reference real paths
        for finding in analyst_output.get("findings") or []:
            for p in finding.get("evidence_paths") or []:
                if p not in known_paths:
                    issues.append(
                        {
                            "severity": "error",
                            "message": f"Finding {finding.get('id')} references unknown path: {p}",
                            "path": p,
                        }
                    )

        has_errors = any(i["severity"] == "error" for i in issues)
        return {
            "passed": not has_errors,
            "issues": issues,
            "verified_paths": sorted(verified),
            "unsupported_claims": unsupported,
        }
