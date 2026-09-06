import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { api } from './client';
import { API_BASE, OAUTH_REDIRECT_URI, TOKEN_KEY, USER_KEY } from '../config';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
}

export async function persistSession(token: string, user: User): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function loadSession(): Promise<{ token: string; user: User } | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const rawUser = await SecureStore.getItemAsync(USER_KEY);
    if (!token || !rawUser) return null;
    return { token, user: JSON.parse(rawUser) as User };
  } catch {
    return null;
  }
}

/** Email + password registration — same endpoint as the website. */
export async function register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
  if (!data.token || !data.user) throw new Error('Registration failed');
  return { token: data.token, user: data.user };
}

/** Email + password login — same endpoint as the website. */
export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await api.post<AuthResponse>('/api/auth/login', { email, password });
  if (!data.token || !data.user) throw new Error('Login failed');
  return { token: data.token, user: data.user };
}

/** Validate the stored token against /api/auth/me (session persistence). */
export async function fetchMe(token: string): Promise<User | null> {
  try {
    const data = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    if (data?.success && data?.user) return data.user as User;
    return null;
  } catch {
    return null;
  }
}

/** Which social providers are configured server-side. */
export async function oauthConfig(): Promise<{ google: boolean; facebook: boolean }> {
  try {
    const data = await api.get<{ success: boolean; providers: Record<string, boolean> }>(
      '/api/auth/oauth-config'
    );
    return { google: Boolean(data.providers?.Google), facebook: Boolean(data.providers?.Facebook) };
  } catch {
    return { google: false, facebook: false };
  }
}

/**
 * Google / Facebook sign-in — opens the SYSTEM browser (ASWebAuthenticationSession
 * on iOS / Custom Tabs on Android) against the SAME OAuth flow the website uses
 * (/api/auth/oauth/:provider/start?mobile=1). On success the server redirects to
 * playbeat://oauth/callback?token=… and the app picks the JWT out of the URL.
 * Same users collection, same session token shape as the web.
 */
export async function socialSignIn(provider: 'google' | 'facebook'): Promise<{ token: string; user: User }> {
  const startUrl = `${API_BASE}/api/auth/oauth/${provider}/start?mobile=1`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, OAUTH_REDIRECT_URI);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in cancelled');
  }
  const url = result.url;
  const error = url.match(/[?&]error=([^&]+)/);
  if (error) throw new Error(decodeURIComponent(error[1].replace(/\+/g, ' ')));
  const tokenMatch = url.match(/[?&]token=([^&]+)/);
  const emailMatch = url.match(/[?&]email=([^&]+)/);
  if (!tokenMatch) throw new Error('Sign-in failed — no session returned');
  const token = decodeURIComponent(tokenMatch[1]);

  // Validate the token, then hydrate the profile from /api/auth/me
  const me = await fetchMe(token);
  const user: User = me
    ? { id: me.id || (me as any)._id, name: me.name, email: me.email, role: me.role }
    : { id: '', name: emailMatch ? decodeURIComponent(emailMatch[1]) : 'Customer', email: '' };
  return { token, user };
}
