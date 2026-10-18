import httpx

from app.config import settings
from app.models import CandidateProfile, Job
from app.schemas import SkillMatchResult


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
    Mengembalikan tuple (answer_markdown, source) dengan source 'gemini' atau 'rule_based'.
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
