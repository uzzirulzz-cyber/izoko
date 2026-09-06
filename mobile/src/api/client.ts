import * as SecureStore from 'expo-secure-store';
import { API_BASE, TOKEN_KEY } from '../config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth, ...rest } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((rest.headers as Record<string, string>) || {}),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, auth = false) => request<T>(path, { method: 'GET', auth }),
  post: <T,>(path: string, body?: any, auth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body || {}), auth }),
};
