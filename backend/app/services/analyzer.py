import json
import re

import httpx

from app.config import settings
from app.schemas import JobAnalysisResult

# Kamus skill populer untuk fallback ekstraktor ketika API Key tidak tersedia
KNOWN_SKILLS: list[str] = [
    "Python",
    "JavaScript",
    "TypeScript",
    "Java",
    "Go",
    "C++",
    "C#",
    "SQL",
    "FastAPI",
    "Django",
    "Flask",
    "React",
    "Next.js",
    "Vue",
    "Node.js",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "Git",
    "CI/CD",
    "Pytest",
    "Linux",
    "REST API",
    "GraphQL",
    "SQLAlchemy",
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "NLP",
    "PyTorch",
    "TensorFlow",
    "Scikit-learn",
    "OpenCV",
    "LLM",
    "RAG",
    "Pandas",
    "NumPy",
]

PREFERRED_SECTION_MARKERS = (
    "preferred",
    "nice to have",
    "plus",
    "bonus",
    "diutamakan",
    "nilai tambah",
)


def _normalize_skills(skills: list[str]) -> list[str]:
    """Menghapus duplikat (case-insensitive) sambil mempertahankan urutan asli."""
    seen: set[str] = set()
    result: list[str] = []
    for raw in skills:
        cleaned = raw.strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def analyze_with_fallback(
    job_title: str, job_description: str
) -> JobAnalysisResult:
    """Ekstraktor deterministik berbasis aturan (dipakai jika LLM tidak aktif/gagal)."""
    lines = job_description.splitlines()
    required_lines: list[str] = []
    preferred_lines: list[str] = []

    in_preferred = False
    for line in lines:
        lower_line = line.lower()
        if any(marker in lower_line for marker in PREFERRED_SECTION_MARKERS):
            in_preferred = True
        if in_preferred:
            preferred_lines.append(line)
        else:
            required_lines.append(line)

    req_text = "\n".join(required_lines)
    pref_text = "\n".join(preferred_lines)

    def find_skills(text: str) -> list[str]:
        found: list[str] = []
        for skill in KNOWN_SKILLS:
            pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"
            if re.search(pattern, text, flags=re.IGNORECASE):
                found.append(skill)
        return found

    required = find_skills(req_text)
    preferred = [
        s
        for s in find_skills(pref_text)
        if s.lower() not in {r.lower() for r in required}
    ]

    lower_desc = f"{job_title} {job_description}".lower()
    if any(k in lower_desc for k in ("intern", "magang", "internship")):
        level = "Intern"
    elif any(k in lower_desc for k in ("senior", "lead", "principal", "5+ years")):
        level = "Senior"
    elif any(k in lower_desc for k in ("mid", "intermediate", "2+ years", "3+ years")):
        level = "Mid Level"
    elif any(
        k in lower_desc for k in ("junior", "entry", "fresh graduate", "0-1 year")
    ):
        level = "Entry Level"
    else:
        level = "Not specified"

    first_sentence = job_description.strip().split(".")[0].strip()
    summary = (
        f"Peran {job_title} dengan fokus pada: {first_sentence[:160]}."
        if first_sentence
        else f"Posisi {job_title}."
    )

    return JobAnalysisResult(
        required_skills=_normalize_skills(required),
        preferred_skills=_normalize_skills(preferred),
        experience_level=level,
        summary=summary,
    )


def analyze_job_description(
    job_title: str,
    company_name: str,
    job_description: str,
) -> tuple[JobAnalysisResult, str]:
    """
    Menganalisis deskripsi pekerjaan menggunakan Gemini Structured Outputs API.
    Mengembalikan tuple (JobAnalysisResult, analysis_source) di mana
    analysis_source bernilai 'gemini' atau 'rule_based'.
    """
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return analyze_with_fallback(job_title, job_description), "rule_based"

    prompt = (
        "Anda adalah AI asisten rekrutmen teknis. Analisis lowongan kerja berikut "
        "dan ekstrak skill wajib (required_skills), skill nilai tambah (preferred_skills), "
        "tingkat pengalaman (experience_level: Intern, Entry Level, Mid Level, Senior, "
        "atau Not specified), serta ringkasan singkat (summary) dalam bahasa yang sama "
        "dengan deskripsi lowongan (1-2 kalimat).\n"
        "Gunakan nama skill yang ringkas dan standar (contoh: 'Python', 'FastAPI', "
        "'PostgreSQL', 'Docker', bukan kalimat panjang).\n\n"
        f"Perusahaan: {company_name}\n"
        f"Posisi: {job_title}\n"
        f"Deskripsi Pekerjaan:\n{job_description}"
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "required_skills": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                    },
                    "preferred_skills": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                    },
                    "experience_level": {"type": "STRING"},
                    "summary": {"type": "STRING"},
                },
                "required": [
                    "required_skills",
                    "preferred_skills",
                    "experience_level",
                    "summary",
                ],
            },
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
        )
        if not raw_text:
            return analyze_with_fallback(job_title, job_description), "rule_based"

        parsed = JobAnalysisResult.model_validate(json.loads(raw_text))
        return (
            JobAnalysisResult(
                required_skills=_normalize_skills(parsed.required_skills),
                preferred_skills=_normalize_skills(parsed.preferred_skills),
                experience_level=parsed.experience_level.strip() or "Not specified",
                summary=parsed.summary.strip(),
            ),
            "gemini",
        )
    except Exception:
        # Jika kuota habis atau jaringan gagal, tetap kembalikan analisis fallback
        return analyze_with_fallback(job_title, job_description), "rule_based"
