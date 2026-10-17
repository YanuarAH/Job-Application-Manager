import pytest
from fastapi.testclient import TestClient

from app.config import settings


def test_default_and_update_profile(client: TestClient) -> None:
    get_res = client.get("/profile")
    assert get_res.status_code == 200
    initial = get_res.json()
    assert initial["full_name"] == ""
    assert initial["skills"] == []

    put_res = client.put(
        "/profile",
        json={
            "full_name": "Yanuar",
            "headline": "AI & Fullstack Engineer",
            "skills": ["Python", "FastAPI", "python", "ReactJS"],
        },
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["full_name"] == "Yanuar"
    assert updated["headline"] == "AI & Fullstack Engineer"
    # Duplikat "python" dihapus otomatis
    assert updated["skills"] == ["Python", "FastAPI", "ReactJS"]


def test_skill_matching_and_gap_analysis(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", None)

    client.put(
        "/profile",
        json={
            "full_name": "Yanuar",
            "headline": "Software Engineer",
            "skills": ["Python", "FastAPI", "Docker"],
        },
    )

    create_res = client.post(
        "/jobs",
        json={
            "company_name": "Acme AI",
            "job_title": "Backend Engineer",
            "job_description": (
                "Required: Python, FastAPI, PostgreSQL, Redis.\n"
                "Preferred: Docker, Kubernetes."
            ),
        },
    )
    job_id = create_res.json()["id"]

    # Sebelum dianalisis harus mengembalikan 400
    pre_match = client.get(f"/jobs/{job_id}/match")
    assert pre_match.status_code == 400

    # Analisis job terlebih dahulu
    client.post(f"/jobs/{job_id}/analyze")

    # Hitung kecocokan:
    # Required = Python, FastAPI, PostgreSQL, Redis (cocok 2/4 -> 50% * 80 = 40)
    # Preferred = Docker, Kubernetes (cocok 1/2 -> 50% * 20 = 10)
    # Total skor = 50
    match_res = client.get(f"/jobs/{job_id}/match")
    assert match_res.status_code == 200
    match_data = match_res.json()

    assert match_data["match_score"] == 50
    assert match_data["matched_required"] == ["Python", "FastAPI"]
    assert match_data["missing_required"] == ["PostgreSQL", "Redis"]
    assert match_data["matched_preferred"] == ["Docker"]
    assert match_data["missing_preferred"] == ["Kubernetes"]
