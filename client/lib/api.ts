const BASE = process.env.NEXT_PUBLIC_API_URL;

if (!BASE) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export function apiFetchAuth(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}