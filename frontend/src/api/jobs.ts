import type {
  AssistantResponse,
  Job,
  JobCreate,
  JobUpdate,
} from "../types/job";
import { request } from "./client";

export function listJobs() {
  return request<Job[]>("/jobs");
}

export function getJob(id: number) {
  return request<Job>(`/jobs/${id}`);
}

export function createJob(payload: JobCreate) {
  return request<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateJob(id: number, payload: JobUpdate) {
  return request<Job>(`/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function analyzeJob(id: number) {
  return request<Job>(`/jobs/${id}/analyze`, {
    method: "POST",
  });
}

export function askJobAssistant(id: number, question: string) {
  return request<AssistantResponse>(`/jobs/${id}/assistant`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function deleteJob(id: number) {
  return request<void>(`/jobs/${id}`, { method: "DELETE" });
}
