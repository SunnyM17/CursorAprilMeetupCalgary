"""Smoke tests — exercise non-LLM logic: parsing, optimizer, exporters."""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

# Allow running as `python tests/test_smoke.py` from project root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent import decomposer, exporters, optimizer  # noqa: E402

SAMPLE_PROJECT = {
    "project": {
        "name": "Recipe Sharing App",
        "key": "RECIPE",
        "summary": "A web app to share and discover recipes.",
        "vision": "Make home cooking more social.",
    },
    "team": [
        {"name": "Alice", "specialties": ["backend"], "capacity_pct": 100},
        {"name": "Bob", "specialties": ["frontend"], "capacity_pct": 80},
        {"name": "Carol", "specialties": ["design", "frontend"], "capacity_pct": 100},
        {"name": "Dave", "specialties": ["devops", "qa"], "capacity_pct": 60},
    ],
    "epics": [
        {
            "id": "E1",
            "title": "Core platform",
            "rationale": "Foundation needed before features.",
            "stories": [
                {
                    "id": "S1.1",
                    "title": "Design data model",
                    "description": "As a dev I need a schema...",
                    "specialty": "backend",
                    "assignee": "Alice",
                    "estimate_points": 3,
                    "depends_on": [],
                    "subtasks": [],
                },
                {
                    "id": "S1.2",
                    "title": "Implement API",
                    "description": "As a dev I need REST endpoints...",
                    "specialty": "backend",
                    "assignee": "Alice",
                    "estimate_points": 5,
                    "depends_on": ["S1.1"],
                    "subtasks": [
                        {"id": "T1.2.a", "title": "Auth endpoints", "estimate_hours": 4},
                        {"id": "T1.2.b", "title": "Recipe CRUD", "estimate_hours": 6},
                    ],
                },
            ],
        },
        {
            "id": "E2",
            "title": "User experience",
            "rationale": "Make it usable.",
            "stories": [
                {
                    "id": "S2.1",
                    "title": "Wireframe homepage",
                    "description": "As a user...",
                    "specialty": "design",
                    "assignee": "Carol",
                    "estimate_points": 2,
                    "depends_on": [],
                    "subtasks": [],
                },
                {
                    "id": "S2.2",
                    "title": "Build homepage",
                    "description": "As a user...",
                    "specialty": "frontend",
                    "assignee": "Bob",
                    "estimate_points": 3,
                    "depends_on": ["S2.1", "S1.2"],
                    "subtasks": [],
                },
            ],
        },
    ],
    "execution_plan": {
        "phases": [],
        "critical_path": [],
        "risks": [{"risk": "Schema churn", "mitigation": "Lock schema by Tue."}],
        "estimated_time_saved_minutes": 60,
    },
}


def test_extract_json_fenced() -> None:
    text = "Sure!\n```json\n" + json.dumps(SAMPLE_PROJECT) + "\n```\nDone."
    p = decomposer.extract_project_json(text)
    assert p is not None and p["project"]["key"] == "RECIPE"
    print("  ✓ fenced JSON extraction")


def test_extract_json_bare() -> None:
    text = "Here it is: " + json.dumps(SAMPLE_PROJECT)
    p = decomposer.extract_project_json(text)
    assert p is not None and len(p["epics"]) == 2
    print("  ✓ bare JSON extraction")


def test_optimizer_critical_path() -> None:
    p = optimizer.annotate(json.loads(json.dumps(SAMPLE_PROJECT)))
    cp = p["execution_plan"]["critical_path"]
    assert cp == ["S1.1", "S1.2", "S2.2"], f"got {cp}"
    report = p["execution_plan"]["_dag_report"]
    assert report["ok"], report
    print(f"  ✓ critical path = {' → '.join(cp)}")


def test_optimizer_load() -> None:
    p = optimizer.annotate(json.loads(json.dumps(SAMPLE_PROJECT)))
    load = p["execution_plan"]["_load_by_member"]
    assert load["Alice"] == 8
    assert load["Bob"] == 3
    print(f"  ✓ load: {load}")


def test_optimizer_detects_cycle() -> None:
    bad = json.loads(json.dumps(SAMPLE_PROJECT))
    bad["epics"][0]["stories"][0]["depends_on"] = ["S1.2"]  # cycle S1.1<->S1.2
    report = optimizer.validate_dag(bad)
    assert not report["ok"]
    assert report["cycles"], "expected cycles to be detected"
    print(f"  ✓ cycle detected: {report['cycles']}")


def test_optimizer_detects_unknown_ref() -> None:
    bad = json.loads(json.dumps(SAMPLE_PROJECT))
    bad["epics"][1]["stories"][1]["depends_on"] = ["S99.99"]
    report = optimizer.validate_dag(bad)
    assert ("S2.2", "S99.99") in report["unknown_refs"]
    print("  ✓ unknown ref detected")


def test_exporters_write_files() -> None:
    p = optimizer.annotate(json.loads(json.dumps(SAMPLE_PROJECT)))
    with tempfile.TemporaryDirectory() as tmp:
        paths = exporters.export_all(p, Path(tmp))
        for k, path in paths.items():
            assert path.exists() and path.stat().st_size > 0, f"{k} empty"
        md = paths["md"].read_text()
        assert "# Recipe Sharing App" in md
        assert "Critical path" in md
        csv_text = paths["csv"].read_text()
        assert "Issue Type,Summary" in csv_text
        assert "Epic" in csv_text and "Story" in csv_text and "Sub-task" in csv_text
        # JSON should NOT contain debug fields
        json_text = paths["json"].read_text()
        assert "_dag_report" not in json_text
        assert "_load_by_member" not in json_text
    print("  ✓ exporters wrote MD + JSON + CSV")


def test_terminal_render() -> None:
    p = optimizer.annotate(json.loads(json.dumps(SAMPLE_PROJECT)))
    exporters.render_terminal(p)
    print("  ✓ terminal render")


def main() -> None:
    print("Running smoke tests...\n")
    test_extract_json_fenced()
    test_extract_json_bare()
    test_optimizer_critical_path()
    test_optimizer_load()
    test_optimizer_detects_cycle()
    test_optimizer_detects_unknown_ref()
    test_exporters_write_files()
    test_terminal_render()
    print("\nAll smoke tests passed.")


if __name__ == "__main__":
    main()
