export const APPLICATION_STATUSES = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Job {
  id: number;
  company_name: string;
  job_title: string;
  job_description: string;
  application_status: ApplicationStatus;
  notes: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  experience_level: string | null;
  summary: string | null;
  analysis_source: string | null;
}

export interface JobCreate {
  company_name: string;
  job_title: string;
  job_description: string;
  application_status?: ApplicationStatus;
  notes?: string | null;
}

export type JobUpdate = Partial<JobCreate>;

export interface AssistantResponse {
  job_id: number;
  question: string;
  answer: string;
  source: string;
}
