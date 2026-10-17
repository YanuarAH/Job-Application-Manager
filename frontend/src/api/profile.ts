import type {
  CandidateProfile,
  CandidateProfileUpdate,
} from "../types/profile";
import { request } from "./client";

export function getProfile() {
  return request<CandidateProfile>("/profile");
}

export function updateProfile(payload: CandidateProfileUpdate) {
  return request<CandidateProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
