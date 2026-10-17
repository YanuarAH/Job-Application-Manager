from fastapi.testclient import TestClient


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


def test_update_job(client: TestClient) -> None:
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
        json={"job_title": "AI Engineer"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["job_title"] == "AI Engineer"
    assert updated["company_name"] == "Tech Inc"


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
