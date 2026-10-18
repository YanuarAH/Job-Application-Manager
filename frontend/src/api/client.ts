export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Wrapper fetch yang dipakai semua modul API.
 * - Menambahkan base URL dan header JSON
 * - Mengubah respons error FastAPI menjadi ApiError dengan pesan yang mudah dibaca
 */
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request gagal (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation errors (422)
        message = data.detail
          .map((d: { loc?: unknown[]; msg?: string }) =>
            `${d.loc?.slice(1).join(".") ?? ""}: ${d.msg ?? ""}`,
          )
          .join(", ");
      }
    } catch {
      // response body bukan JSON
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getHealth() {
  return request<{ status: string }>("/health");
}
