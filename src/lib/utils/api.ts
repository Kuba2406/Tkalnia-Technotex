// ============================================================
// lib/utils/api.ts – API helper to wrap fetch calls
// ============================================================

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json.data as T;
}

export function apiGet<T>(url: string) {
  return apiFetch<T>(url);
}

export function apiPost<T>(url: string, body: unknown) {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(url: string, body: unknown) {
  return apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete(url: string) {
  return apiFetch<void>(url, { method: 'DELETE' });
}

// Standard API response helper for route handlers
import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
