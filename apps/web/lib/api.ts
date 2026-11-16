export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const ACCESS_TOKEN_KEY = 'miui-crm-access-token';
export const USER_KEY = 'miui-crm-user';

export type User = { id: string; name: string; email: string; role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' };
export type Lead = { id: string; name: string; email: string; company?: string | null; phone?: string | null; source?: string | null; status: string; version: number; assignedTo?: { id: string; name: string } | null; createdAt: string };
export type Deal = { id: string; name: string; value: string; stage: string; version: number; expectedCloseDate?: string | null; owner?: { name: string }; lead?: { name: string } | null; stageHistory?: { toStage: string; createdAt: string }[] };
export type Task = { id: string; title: string; description?: string | null; dueDate: string; priority: string; status: string; version: number; lead?: { name: string } | null; deal?: { name: string } | null; assignee?: { name: string } };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? Array.isArray(body.message) ? body.message.join(', ') : String(body.message)
      : 'The request could not be completed.';
    throw new ApiError(message, response.status);
  }
  return body as T;
}
