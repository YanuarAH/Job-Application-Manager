import type { SkillMatchResult } from "../types/profile";

const SKILL_ALIASES: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  nextjs: "next.js",
  nodejs: "node.js",
  postgres: "postgresql",
  postgre: "postgresql",
  "restful api": "rest api",
  rest: "rest api",
  "rest apis": "rest api",
  ml: "machine learning",
  dl: "deep learning",
  cv: "computer vision",
  "natural language processing": "nlp",
  "scikit learn": "scikit-learn",
  sklearn: "scikit-learn",
  k8s: "kubernetes",
  "ci cd": "ci/cd",
  cicd: "ci/cd",
};

export function canonicalSkill(skill: string): string {
  const cleaned = skill.trim().toLowerCase().replace(/\s+/g, " ");
  return SKILL_ALIASES[cleaned] ?? cleaned;
}

export function deduplicateSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of skills) {
    const cleaned = raw.trim();
    if (!cleaned) continue;
    const key = canonicalSkill(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(cleaned);
    }
  }
  return output;
}

export function calculateSkillMatch(
  jobId: number,
  candidateSkills: string[],
  requiredSkills: string[] | null,
  preferredSkills: string[] | null,
): SkillMatchResult {
  const candidateKeys = new Set(
    candidateSkills.filter((s) => s.trim()).map(canonicalSkill),
  );

  const reqList = deduplicateSkills(requiredSkills ?? []);
  const reqKeys = new Set(reqList.map(canonicalSkill));
  const prefList = deduplicateSkills(preferredSkills ?? []).filter(
    (s) => !reqKeys.has(canonicalSkill(s)),
  );

  const matchedReq: string[] = [];
  const missingReq: string[] = [];
  for (const skill of reqList) {
    if (candidateKeys.has(canonicalSkill(skill))) {
      matchedReq.push(skill);
    } else {
      missingReq.push(skill);
    }
  }

  const matchedPref: string[] = [];
  const missingPref: string[] = [];
  for (const skill of prefList) {
    if (candidateKeys.has(canonicalSkill(skill))) {
      matchedPref.push(skill);
    } else {
      missingPref.push(skill);
    }
  }

  const totalReq = reqList.length;
  const totalPref = prefList.length;

  let score = 0;
  let formulaNote = "Belum ada skill yang diekstrak dari lowongan ini.";

  if (totalReq > 0 && totalPref > 0) {
    score = Math.round(
      (matchedReq.length / totalReq) * 80 +
        (matchedPref.length / totalPref) * 20,
    );
    formulaNote = `80% Required (${matchedReq.length}/${totalReq}) + 20% Preferred (${matchedPref.length}/${totalPref})`;
  } else if (totalReq > 0) {
    score = Math.round((matchedReq.length / totalReq) * 100);
    formulaNote = `100% Required (${matchedReq.length}/${totalReq})`;
  } else if (totalPref > 0) {
    score = Math.round((matchedPref.length / totalPref) * 100);
    formulaNote = `100% Preferred (${matchedPref.length}/${totalPref})`;
  }

  return {
    job_id: jobId,
    match_score: score,
    matched_required: matchedReq,
    missing_required: missingReq,
    matched_preferred: matchedPref,
    missing_preferred: missingPref,
    formula_note: formulaNote,
  };
}
