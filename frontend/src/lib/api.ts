/**
 * API Client — Safe WA Gateway Frontend
 * Terhubung ke FastAPI backend di localhost:8000
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://appwa-s5o6.onrender.com';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? localStorage.getItem('token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  });
  
  if (res.status === 401) {
    if (isBrowser && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  
  if (!res.ok) {
    let errMessage = `API error ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.detail) errMessage = errData.detail;
    } catch (e) {
      // Abaikan jika bukan JSON
    }
    throw new Error(errMessage);
  }
  
  return res.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getStats: () => apiFetch<DashboardStats>('/dashboard/stats'),

  // Sessions
  getSessions: () => apiFetch<{ sessions: Session[]; total: number }>('/sessions'),
  getSessionStatus: (id: string) => apiFetch<Session>(`/sessions/${id}/status`),
  getWaStatus: (id?: string) => apiFetch<{ scan_url: string, wa_connected: boolean, engine_running: boolean, phone?: string, name?: string }>(id ? `/wa/status/${id}` : '/wa/status'),
  getGroups: (id: string) => apiFetch<{ success: boolean, groups: { id: string, name: string }[] }>(`/wa/groups/${id}`),
  getQrCode: (id: string) => apiFetch<{ qr_data: unknown }>(`/sessions/${id}/qr`),
  addSession: (data: AddSessionPayload) =>
    apiFetch<{ session: Session }>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  deleteSession: (id: string) => apiFetch<{ status: string }>(`/sessions/${id}`, { method: 'DELETE' }),

  // Queue
  getQueueStatus: () => apiFetch<QueueStatus>('/queue/status'),

  // Send message
  sendMessage: (data: SendMessagePayload) =>
    apiFetch('/send_safe_message', { method: 'POST', body: JSON.stringify(data) }),

  // Warmup
  getWarmupStatus: () => apiFetch<WarmupStatus>('/warmup/status'),
  registerWarmup: (data: RegisterWarmupPayload) =>
    apiFetch('/warmup/register', { method: 'POST', body: JSON.stringify(data) }),
  triggerWarmup: () => apiFetch('/warmup/trigger', { method: 'POST' }),
  // Auth
  login: (data: any) =>
    apiFetch<{ access_token: string, username: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) =>
    apiFetch<{ status: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Types ──────────────────────────────────────────────────────────────────────

export type DashboardStats = {
  active_sessions: number;
  warming_sessions: number;
  messages_sent_today: number;
  success_rate: number;
  banned_numbers: number;
  queue_depth: number;
  total_queued: number;
  total_sent: number;
  total_failed: number;
  recent_sent: SentMessage[];
  evolution_configured: boolean;
  gemini_configured: boolean;
  middleware: Record<string, boolean | string>;
};

export type Session = {
  id: string;
  name: string;
  phone: string;
  status: 'connected' | 'warming' | 'disconnected' | 'banned';
  trust: number;
  sent_today: number;
  proxy: string;
  warmup: boolean;
};

export type QueueStatus = {
  queue_depth: number;
  total_queued: number;
  total_sent: number;
  total_failed: number;
  rate_limit: string;
  pending_messages: PendingMessage[];
  recent_sent: SentMessage[];
};

export type SentMessage = {
  id: string;
  to: string;
  text: string;
  zwc: boolean;
  delay_ms: number;
  chunk: string;
  sent_at: string;
  simulated: boolean;
};

export type PendingMessage = {
  id: string;
  phone: string;
  preview: string;
  status: string;
  chunks: number;
  added_at: number;
  retries: number;
};

export type WarmupStatus = {
  active: WarmupSession[];
  gemini_enabled: boolean;
};

export type WarmupSession = {
  phone: string;
  day: number;
  phase: string;
  chats_today: number;
  max_today: number;
  total_chats: number;
  trust_score: number;
  is_graduated: boolean;
};

export type SendMessagePayload = {
  phone: string;
  message: string;
  session_id?: string;
};

export type AddSessionPayload = {
  name: string;
  phone: string;
  instance_name: string;
  enable_warmup: boolean;
};

export type RegisterWarmupPayload = {
  phone: string;
  session_id: string;
  partner_pool?: string[];
};
