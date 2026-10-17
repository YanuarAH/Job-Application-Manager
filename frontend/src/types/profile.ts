export interface CandidateProfile {
  id: number;
  full_name: string;
  headline: string;
  skills: string[];
}

export interface CandidateProfileUpdate {
  full_name: string;
  headline: string;
  skills: string[];
}

export interface SkillMatchResult {
  job_id: number;
  match_score: number;
  matched_required: string[];
  missing_required: string[];
  matched_preferred: string[];
  missing_preferred: string[];
  formula_note: string;
}
