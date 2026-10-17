export interface Job {
  id: number;
  company_name: string;
  job_title: string;
  job_description: string;
}

export type JobCreate = Omit<Job, "id">;

export type JobUpdate = Partial<JobCreate>;
