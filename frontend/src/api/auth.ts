import { request } from "./client";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  is_demo: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  seed_sample_jobs: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerUser(payload: RegisterPayload) {
  return request<AuthTokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload) {
  return request<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginDemoAccount() {
  return request<AuthTokenResponse>("/auth/demo", {
    method: "POST",
  });
}

export function resetSampleData() {
  return request<AuthUser>("/auth/demo/reset", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return request<AuthUser>("/auth/me");
}
