def test_register_login_and_multi_user_isolation(client):
    # 1. Register User A tanpa sample jobs
    res_a = client.post(
        "/auth/register",
        json={
            "email": "alice@example.com",
            "password": "password123",
            "full_name": "Alice Engineer",
            "seed_sample_jobs": False,
        },
    )
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B dengan sample jobs
    res_b = client.post(
        "/auth/register",
        json={
            "email": "bob@example.com",
            "password": "password123",
            "full_name": "Bob Developer",
            "seed_sample_jobs": True,
        },
    )
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A punya 0 job, sedangkan User B langsung punya 6 sample jobs
    jobs_a = client.get("/jobs", headers=headers_a).json()
    jobs_b = client.get("/jobs", headers=headers_b).json()
    assert len(jobs_a) == 0
    assert len(jobs_b) == 6

    # 4. User A membuat 1 job pribadi -> tidak bocor ke User B
    create_a = client.post(
        "/jobs",
        headers=headers_a,
        json={
            "company_name": "Private Corp",
            "job_title": "AI Researcher",
            "job_description": "Python and PyTorch",
        },
    )
    assert create_a.status_code == 201
    job_a_id = create_a.json()["id"]

    # User B tidak boleh bisa mengakses job milik User A
    forbidden_get = client.get(f"/jobs/{job_a_id}", headers=headers_b)
    assert forbidden_get.status_code == 404

    # 5. Login ulang sebagai User A
    login_a = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert login_a.status_code == 200
    assert login_a.json()["user"]["full_name"] == "Alice Engineer"


def test_demo_account_and_persistent_chat_history(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", None)

    # 1. Login 1-klik ke akun Demo
    demo_res = client.post("/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert demo_data["user"]["is_demo"] is True
    headers = {"Authorization": f"Bearer {demo_data['access_token']}"}

    # 2. Pastikan akun Demo otomatis memiliki 6 sample jobs dan profil
    jobs = client.get("/jobs", headers=headers).json()
    assert len(jobs) == 6
    profile = client.get("/profile", headers=headers).json()
    assert "Python" in profile["skills"]

    # 3. Kirim pesan ke AI Career Assistant dan pastikan riwayat tersimpan di DB
    chat_res = client.post(
        "/assistant/chat",
        headers=headers,
        json={"message": "Urutkan lowongan terbaik untuk saya", "history": []},
    )
    assert chat_res.status_code == 200

    history_res = client.get("/assistant/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

    # 4. Hapus riwayat chat
    del_res = client.delete("/assistant/history", headers=headers)
    assert del_res.status_code == 204
    assert client.get("/assistant/history", headers=headers).json() == []
