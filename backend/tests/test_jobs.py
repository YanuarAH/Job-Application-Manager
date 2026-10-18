import pytest
from fastapi.testclient import TestClient

from app.config import settings


def test_root_and_health(client: TestClient) -> None:
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert root_res.json()["status"] == "running"

    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "healthy"}


def test_create_and_get_job(client: TestClient) -> None:
    payload = {
        "company_name": "Acme Corp",
        "job_title": "Backend Engineer",
        "job_description": "Build REST APIs with Python, FastAPI, and PostgreSQL.",
    }
    create_res = client.post("/jobs", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["id"] == 1
    assert created["company_name"] == payload["company_name"]
    assert created["job_title"] == payload["job_title"]
    assert created["job_description"] == payload["job_description"]
    assert created["application_status"] == "Saved"
    assert created["notes"] is None
    assert created["required_skills"] is None
    assert created["analysis_source"] is None

    get_res = client.get(f"/jobs/{created['id']}")
    assert get_res.status_code == 200
    assert get_res.json() == created


def test_list_jobs_ordered_newest_first(client: TestClient) -> None:
    client.post(
        "/jobs",
        json={
            "company_name": "First Co",
            "job_title": "Junior Dev",
            "job_description": "First job description",
        },
    )
    client.post(
        "/jobs",
        json={
            "company_name": "Second Co",
            "job_title": "Senior Dev",
            "job_description": "Second job description",
        },
    )

    res = client.get("/jobs")
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) == 2
    assert jobs[0]["company_name"] == "Second Co"
    assert jobs[1]["company_name"] == "First Co"


def test_create_job_validation_error(client: TestClient) -> None:
    res = client.post(
        "/jobs",
        json={
            "company_name": "",
            "job_title": "Engineer",
            "job_description": "Valid description",
        },
    )
    assert res.status_code == 422


def test_update_job_and_application_tracking(client: TestClient) -> None:
    create_res = client.post(
        "/jobs",
        json={
            "company_name": "Tech Inc",
            "job_title": "AI Intern",
            "job_description": "Initial description",
        },
    )
    job_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/jobs/{job_id}",
        json={
            "job_title": "AI Engineer",
            "application_status": "Interview",
            "notes": "Technical interview scheduled on Friday.",
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["job_title"] == "AI Engineer"
    assert updated["company_name"] == "Tech Inc"
    assert updated["application_status"] == "Interview"
    assert updated["notes"] == "Technical interview scheduled on Friday."

    # Filter berdasarkan status
    interview_list = client.get("/jobs?status_filter=Interview").json()
    assert len(interview_list) == 1
    assert interview_list[0]["id"] == job_id

    offer_list = client.get("/jobs?status_filter=Offer").json()
    assert len(offer_list) == 0

    # Status tidak valid harus ditolak 422
    invalid_status_res = client.patch(
        f"/jobs/{job_id}",
        json={"application_status": "UnknownStatus"},
    )
    assert invalid_status_res.status_code == 422


def test_delete_job(client: TestClient) -> None:
    create_res = client.post(
        "/jobs",
        json={
            "company_name": "Temp Co",
            "job_title": "Temp Role",
            "job_description": "To be deleted",
        },
    )
    job_id = create_res.json()["id"]

    del_res = client.delete(f"/jobs/{job_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/jobs/{job_id}")
    assert get_res.status_code == 404


def test_job_not_found_errors(client: TestClient) -> None:
    assert client.get("/jobs/999").status_code == 404
    assert (
        client.patch("/jobs/999", json={"job_title": "Ghost"}).status_code
        == 404
    )
    assert client.delete("/jobs/999").status_code == 404
    assert client.post("/jobs/999/analyze").status_code == 404


def test_analyze_job_with_rule_based_fallback(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", None)

    create_res = client.post(
        "/jobs",
        json={
            "company_name": "DataLab",
            "job_title": "AI Engineer Intern",
            "job_description": (
                "We are looking for an AI Engineer Intern who knows Python, "
                "FastAPI, and PostgreSQL.\n"
                "Preferred qualifications: experience with Docker and PyTorch."
            ),
        },
    )
    job_id = create_res.json()["id"]

    analyze_res = client.post(f"/jobs/{job_id}/analyze")
    assert analyze_res.status_code == 200
    analyzed = analyze_res.json()

    assert analyzed["analysis_source"] == "rule_based"
    assert "Python" in analyzed["required_skills"]
    assert "FastAPI" in analyzed["required_skills"]
    assert "PostgreSQL" in analyzed["required_skills"]
    assert "Docker" in analyzed["preferred_skills"]
    assert "PyTorch" in analyzed["preferred_skills"]
    assert analyzed["experience_level"] == "Intern"
    assert analyzed["summary"]
