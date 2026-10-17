export interface Job {
  id: number;
  company_name: string;
  job_title: string;
  job_description: string;
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
}

export type JobUpdate = Partial<JobCreate>;
