const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('imv2_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('imv2_token');
    localStorage.removeItem('imv2_user');
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export const apiGet = <T>(path: string) => api<T>(path);

export const apiPost = <T>(path: string, body: any) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: any) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body?: any) =>
  api<T>(path, {
    method: 'PATCH',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
