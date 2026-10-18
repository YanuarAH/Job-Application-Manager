import { request } from "./client";

export interface CareerChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: string;
}

export interface CareerChatResponse {
  reply: string;
  source: string;
}

export function sendCareerChat(
  message: string,
  history: CareerChatMessage[],
) {
  return request<CareerChatResponse>("/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });
}
