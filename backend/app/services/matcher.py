from app.schemas import SkillMatchResult

# Pemetaan sinonim umum agar pencocokan tidak gagal hanya karena perbedaan penulisan
SKILL_ALIASES: dict[str, str] = {
    "py": "python",
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nextjs": "next.js",
    "nodejs": "node.js",
    "postgres": "postgresql",
    "postgre": "postgresql",
    "restful api": "rest api",
    "rest": "rest api",
    "rest apis": "rest api",
    "ml": "machine learning",
    "dl": "deep learning",
    "cv": "computer vision",
    "natural language processing": "nlp",
    "scikit learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "k8s": "kubernetes",
    "ci cd": "ci/cd",
    "cicd": "ci/cd",
}


def canonical_skill(skill: str) -> str:
    """Mengubah nama skill ke bentuk kanonik lowercase untuk perbandingan."""
    cleaned = " ".join(skill.strip().lower().split())
    return SKILL_ALIASES.get(cleaned, cleaned)


def deduplicate_skills(skills: list[str]) -> list[str]:
    """Menghapus skill kosong atau duplikat berdasarkan bentuk kanoniknya."""
    seen: set[str] = set()
    output: list[str] = []
    for raw in skills:
        cleaned = raw.strip()
        if not cleaned:
            continue
        key = canonical_skill(cleaned)
        if key not in seen:
            seen.add(key)
            output.append(cleaned)
    return output


def calculate_skill_match(
    job_id: int,
    candidate_skills: list[str],
    required_skills: list[str] | None,
    preferred_skills: list[str] | None,
) -> SkillMatchResult:
    """
    Menghitung kecocokan skill kandidat terhadap lowongan secara transparan.

    Rumus Bobot:
    - Jika lowongan memiliki required_skills DAN preferred_skills:
      Score = 80% * (matched_required / total_required) + 20% * (matched_preferred / total_preferred)
    - Jika lowongan hanya memiliki required_skills:
      Score = 100% * (matched_required / total_required)
    - Jika lowongan hanya memiliki preferred_skills:
      Score = 100% * (matched_preferred / total_preferred)
    """
    candidate_keys = {
        canonical_skill(s) for s in candidate_skills if s.strip()
    }

    req_list = deduplicate_skills(required_skills or [])
    pref_list = [
        s
        for s in deduplicate_skills(preferred_skills or [])
        if canonical_skill(s) not in {canonical_skill(r) for r in req_list}
    ]

    matched_req: list[str] = []
    missing_req: list[str] = []
    for skill in req_list:
        if canonical_skill(skill) in candidate_keys:
            matched_req.append(skill)
        else:
            missing_req.append(skill)

    matched_pref: list[str] = []
    missing_pref: list[str] = []
    for skill in pref_list:
        if canonical_skill(skill) in candidate_keys:
            matched_pref.append(skill)
        else:
            missing_pref.append(skill)

    total_req = len(req_list)
    total_pref = len(pref_list)

    if total_req > 0 and total_pref > 0:
        req_ratio = len(matched_req) / total_req
        pref_ratio = len(matched_pref) / total_pref
        score = round((req_ratio * 80) + (pref_ratio * 20))
        formula_note = (
            f"80% Required ({len(matched_req)}/{total_req}) + "
            f"20% Preferred ({len(matched_pref)}/{total_pref})"
        )
    elif total_req > 0:
        req_ratio = len(matched_req) / total_req
        score = round(req_ratio * 100)
        formula_note = f"100% Required ({len(matched_req)}/{total_req})"
    elif total_pref > 0:
        pref_ratio = len(matched_pref) / total_pref
        score = round(pref_ratio * 100)
        formula_note = f"100% Preferred ({len(matched_pref)}/{total_pref})"
    else:
        score = 0
        formula_note = "Belum ada skill yang diekstrak dari lowongan ini."

    return SkillMatchResult(
        job_id=job_id,
        match_score=score,
        matched_required=matched_req,
        missing_required=missing_req,
        matched_preferred=matched_pref,
        missing_preferred=missing_pref,
        formula_note=formula_note,
    )
