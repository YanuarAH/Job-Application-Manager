from collections import Counter

import httpx

from app.config import settings
from app.models import CandidateProfile, Job
from app.schemas import CareerChatMessage, SkillMatchResult
from app.services.matcher import calculate_skill_match


def _build_fallback_answer(
    job: Job,
    profile: CandidateProfile,
    match: SkillMatchResult,
    question: str,
) -> str:
    """Jawaban terstruktur deterministik jika API Key kosong atau jaringan gagal."""
    matched = match.matched_required + match.matched_preferred
    gaps = match.missing_required + match.missing_preferred

    matched_str = ", ".join(matched) if matched else "belum ada yang tercatat di profil"
    gap_req_str = (
        ", ".join(match.missing_required)
        if match.missing_required
        else "tidak ada (semua skill wajib sudah terpenuhi)"
    )
    gap_pref_str = (
        ", ".join(match.missing_preferred)
        if match.missing_preferred
        else "tidak ada"
    )

    lines = [
        f"### Panduan Persiapan: {job.job_title} — {job.company_name}",
        f"**Skor Kecocokan Saat Ini:** {match.match_score}% ({match.formula_note})",
        "",
        "#### 1. Kekuatan yang Perlu Ditonjolkan di CV & Interview",
        f"- Skill relevan yang sudah Anda miliki: **{matched_str}**.",
        "- Pastikan setiap skill di atas memiliki contoh project nyata atau metrik dampak pada CV Anda.",
        "",
        "#### 2. Prioritas Penutup Skill Gap",
        f"- **Skill Wajib (Prioritas Utama):** {gap_req_str}.",
        f"- **Skill Nilai Tambah (Plus):** {gap_pref_str}.",
    ]

    if gaps:
        top_gaps = gaps[:3]
        lines.append(
            f"- **Saran Belajar Cepat:** Buat mini-project atau fitur demonstrasi yang menggabungkan {', '.join(top_gaps)} sebelum sesi wawancara."
        )

    focus_skills = (match.matched_required + match.missing_required)[:3] or [
        job.job_title
    ]
    lines.extend(
        [
            "",
            "#### 3. Prediksi Pertanyaan Interview Teknis",
            *[
                f"- Bagaimana pengalaman Anda mengimplementasikan **{s}** untuk menyelesaikan masalah produksi, dan apa tantangan terbesarnya?"
                for s in focus_skills
            ],
            f"- Mengapa Anda tertarik bergabung dengan **{job.company_name}** sebagai **{job.job_title}**?",
            "",
            f'*Fokus pertanyaan Anda:* "{question.strip()}"',
        ]
    )
    return "\n".join(lines)


def generate_career_advice(
    job: Job,
    profile: CandidateProfile,
    match: SkillMatchResult,
    question: str,
) -> tuple[str, str]:
    """
    Menghasilkan saran karier/interview kontekstual berdasarkan data lowongan,
    profil kandidat, dan perhitungan skill gap.
    """
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return _build_fallback_answer(job, profile, match, question), "rule_based"

    prompt = (
        "Anda adalah AI Career Coach & Technical Interviewer senior. "
        "Berikan saran yang spesifik, praktis, dan terstruktur (gunakan poin-poin singkat) "
        "dalam bahasa Indonesia berdasarkan data nyata berikut:\n\n"
        f"=== DATA LOWONGAN ===\n"
        f"- Perusahaan: {job.company_name}\n"
        f"- Posisi: {job.job_title}\n"
        f"- Level: {job.experience_level or 'Not specified'}\n"
        f"- Deskripsi: {job.job_description}\n"
        f"- Required Skills: {', '.join(job.required_skills or []) or '-'}\n"
        f"- Preferred Skills: {', '.join(job.preferred_skills or []) or '-'}\n\n"
        f"=== DATA KANDIDAT & ANALISIS SKILL GAP ===\n"
        f"- Nama: {profile.full_name or 'Kandidat'}\n"
        f"- Headline: {profile.headline or '-'}\n"
        f"- Semua Skill Kandidat: {', '.join(profile.skills or []) or '-'}\n"
        f"- Skor Kecocokan: {match.match_score}% ({match.formula_note})\n"
        f"- Skill Wajib yang Sudah Cocok: {', '.join(match.matched_required) or '-'}\n"
        f"- Skill Wajib yang Belum Dimiliki (GAP UTAMA): {', '.join(match.missing_required) or '-'}\n"
        f"- Skill Plus yang Belum Dimiliki: {', '.join(match.missing_preferred) or '-'}\n\n"
        f"=== PERTANYAAN PENGGUNA ===\n"
        f"{question.strip()}\n\n"
        "Jawab langsung ke inti permasalahan secara ringkas dan mengacu pada skill/posisi di atas."
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
        },
    }

    try:
        with httpx.Client(timeout=25.0) as client:
            response = client.post(
                url,
                params={"key": api_key},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        ).strip()

        if not raw_text:
            return (
                _build_fallback_answer(job, profile, match, question),
                "rule_based",
            )

        return raw_text, "gemini"
    except Exception:
        return _build_fallback_answer(job, profile, match, question), "rule_based"


def _build_global_fallback_reply(
    profile: CandidateProfile,
    jobs: list[Job],
    message: str,
) -> str:
    """Jawaban analitis deterministik lintas lowongan jika LLM tidak tersedia."""
    candidate_skills = profile.skills or []
    scored_jobs: list[tuple[Job, SkillMatchResult]] = []
    gap_counter: Counter[str] = Counter()

    for job in jobs:
        match = calculate_skill_match(
            job_id=job.id,
            candidate_skills=candidate_skills,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )
        scored_jobs.append((job, match))
        for missing in match.missing_required:
            gap_counter[missing] += 1

    scored_jobs.sort(key=lambda item: item[1].match_score, reverse=True)
    top_matches = scored_jobs[:3]
    top_gaps = [skill for skill, _ in gap_counter.most_common(5)]

    lines = [
        f"Halo **{profile.full_name or 'Rekan'}**! Berikut analisis karier menyeluruh berdasarkan **{len(jobs)} lowongan** dan **{len(candidate_skills)} skill** di profil Anda:",
        "",
        "### 1. Rekomendasi Prioritas Lamaran (Match Tertinggi)",
    ]

    if top_matches:
        for job, m in top_matches:
            gap_info = (
                f"Gap utama: {', '.join(m.missing_required[:3])}"
                if m.missing_required
                else "Semua skill wajib terpenuhi!"
            )
            lines.append(
                f"- **{job.job_title} — {job.company_name}** ({m.match_score}% Match | Status: `{job.application_status}`) → {gap_info}"
            )
    else:
        lines.append("- Belum ada lowongan yang dianalisis.")

    lines.extend(
        [
            "",
            "### 2. Skill Gap Paling Sering Muncul di Target Karier Anda",
            (
                f"- Prioritaskan mempelajari: **{', '.join(top_gaps)}** karena paling sering diminta sebagai syarat wajib di daftar lowongan Anda."
                if top_gaps
                else "- Tidak ada skill gap wajib yang terdeteksi pada lowongan yang sudah dianalisis."
            ),
            "",
            "### 3. Langkah Selanjutnya yang Disarankan",
            "- Fokuskan persiapan interview pada lowongan berstatus `Interview` dan `Applied` yang memiliki skor kecocokan di atas 65%.",
            "- Tambahkan bukti project pada CV untuk skill yang paling sering muncul di atas.",
            "",
            f'*Pertanyaan Anda:* "{message.strip()}"',
        ]
    )
    return "\n".join(lines)


def generate_global_career_chat(
    profile: CandidateProfile,
    jobs: list[Job],
    message: str,
    history: list[CareerChatMessage],
) -> tuple[str, str]:
    """
    AI Career Assistant global yang memahami profil kandidat dan seluruh
    lowongan kerja beserta skor kecocokan & skill gap masing-masing.
    """
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return _build_global_fallback_reply(profile, jobs, message), "rule_based"

    candidate_skills = profile.skills or []
    job_summaries: list[str] = []
    gap_counter: Counter[str] = Counter()

    for job in jobs:
        match = calculate_skill_match(
            job_id=job.id,
            candidate_skills=candidate_skills,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )
        for missing in match.missing_required:
            gap_counter[missing] += 1
        job_summaries.append(
            f"- [{job.application_status}] {job.job_title} di {job.company_name} "
            f"(Level: {job.experience_level or 'N/A'}, Match: {match.match_score}%): "
            f"Matched={', '.join(match.matched_required) or '-'}; "
            f"Missing Required={', '.join(match.missing_required) or '-'}; "
            f"Notes={job.notes or '-'}"
        )

    top_gaps_str = (
        ", ".join(f"{s} ({c} job)" for s, c in gap_counter.most_common(6))
        or "Tidak ada"
    )

    history_lines = [
        f"{'Kandidat' if h.role == 'user' else 'AI Coach'}: {h.content}"
        for h in history[-6:]
    ]
    history_block = "\n".join(history_lines) if history_lines else "(Percakapan baru)"

    prompt = (
        "Anda adalah AI Career Advisor & Tech Mentor pribadi. Tugas Anda membantu kandidat "
        "memilih arah karier, memprioritaskan lamaran kerja, merancang roadmap belajar untuk menutup skill gap, "
        "dan menyiapkan strategi interview berdasarkan SELURUH data portofolio lowongan kandidat di bawah ini.\n\n"
        f"=== PROFIL KANDIDAT ===\n"
        f"- Nama: {profile.full_name or 'Kandidat'}\n"
        f"- Target Role / Headline: {profile.headline or '-'}\n"
        f"- Skill Saat Ini ({len(candidate_skills)}): {', '.join(candidate_skills) or '-'}\n"
        f"- Skill Gap Paling Sering Diminta Pasar: {top_gaps_str}\n\n"
        f"=== DAFTAR LOWONGAN & SKOR KECOCOKAN ({len(jobs)} Lowongan) ===\n"
        + ("\n".join(job_summaries) if job_summaries else "Belum ada lowongan.")
        + f"\n\n=== RIWAYAT PERCAKAPAN SEBELUMNYA ===\n{history_block}\n\n"
        f"=== PESAN TERBARU KANDIDAT ===\n{message.strip()}\n\n"
        "Berikan jawaban dalam bahasa Indonesia yang ramah, analitis, mengacu langsung pada nama perusahaan/posisi "
        "dan persentase kecocokan di atas, serta gunakan poin-poin yang rapi."
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
        },
    }

    try:
        with httpx.Client(timeout=25.0) as client:
            response = client.post(
                url,
                params={"key": api_key},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        ).strip()

        if not raw_text:
            return (
                _build_global_fallback_reply(profile, jobs, message),
                "rule_based",
            )

        return raw_text, "gemini"
    except Exception:
        return _build_global_fallback_reply(profile, jobs, message), "rule_based"
