const API_ROOT =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:5000';

export const ADMIN_API_BASE_URL = `${API_ROOT}/admin/api/v1`;

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'viewer';

export type AdminPermission =
  | 'dashboard:read'
  | 'domains:read'
  | 'domains:write'
  | 'blocklist:read'
  | 'blocklist:write'
  | 'settings:read'
  | 'settings:write'
  | 'abuse:read'
  | 'abuse:write'
  | 'logs:read'
  | 'inboxes:lookup'
  | 'inboxes:delete'
  | 'users:read'
  | 'users:write'
  | 'apikeys:read'
  | 'apikeys:write'
  | 'reserved_names:read'
  | 'reserved_names:write'
  | 'announcements:read'
  | 'announcements:write'
  | 'admins:manage'
  | 'audit:read';

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly totpEnabled: boolean;
  readonly status: 'active' | 'disabled';
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
}

export interface DomainRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
  readonly notes: string;
  readonly createdAt: string;
}

export type BlocklistEntryType = 'sender' | 'domain' | 'ip' | 'keyword';

export interface BlocklistRow {
  readonly id: number;
  readonly type: BlocklistEntryType;
  readonly value: string;
  readonly reason: string;
  readonly createdAt: string;
}

export interface SettingRow {
  readonly key: string;
  readonly value: unknown;
  readonly updatedAt: string;
}

export interface AbuseReportRow {
  readonly id: number;
  readonly address: string;
  readonly messageId: string | null;
  readonly reason: string;
  readonly reporterIp: string;
  readonly status: 'open' | 'resolved' | 'dismissed' | string;
  readonly createdAt: string;
}

export interface SmtpLogRow {
  readonly id: number;
  readonly time: string;
  readonly ip: string;
  readonly from: string;
  readonly to: string;
  readonly result: 'accepted' | 'rejected' | 'flagged';
  readonly reason: string;
  readonly spamScore: number;
}

export interface AuditLogRow {
  readonly id: number;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly details: unknown;
  readonly createdAt: string;
}

export interface ManagedUserRow {
  readonly id: string;
  readonly email: string;
  readonly planId: string;
  readonly status: 'active' | 'banned' | 'deleted';
  readonly emailVerified: boolean;
  readonly totpEnabled: boolean;
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
}

export interface ManagedApiKeyRow {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly last4: string;
  readonly scopes: readonly string[];
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

export interface ReservedNameRow {
  readonly name: string;
  readonly reason: string;
  readonly createdAt: string;
}

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export interface AnnouncementRow {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly severity: AnnouncementSeverity;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LookupAttachmentMetadata {
  readonly index: number;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
}

export interface LookupMessage {
  readonly id: string;
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly date: string;
  readonly text: string;
  readonly html: string;
  readonly hasRemoteContent: boolean;
  readonly otp: string | null;
  readonly links: readonly string[];
  readonly attachments: readonly LookupAttachmentMetadata[];
  readonly spamScore: number;
  readonly spamFlagged: boolean;
}

export interface InboxLookupResult {
  readonly store: 'redis_anonymous' | 'postgres_account';
  readonly address: string;
  readonly userId?: string;
  readonly expiresAt: string;
  readonly messages: readonly LookupMessage[];
}

export interface DashboardStats {
  readonly emailsLastHour: number;
  readonly rejectionsByReason: Record<string, number>;
  readonly timestamp: string;
}

export interface AdminLoginResponse {
  readonly mfaRequired: boolean;
  readonly setupRequired: boolean;
  readonly mfaToken: string;
  readonly totpSetup?: {
    readonly secret: string;
    readonly otpauthUrl: string;
  };
}

export interface AdminMfaResponse {
  readonly authenticated: boolean;
  readonly admin: AdminUser;
  readonly recoveryCodes?: readonly string[];
}

const VIEWER_PERMISSIONS: readonly string[] = [
  'dashboard:read',
  'domains:read',
  'blocklist:read',
  'settings:read',
  'abuse:read',
  'logs:read',
  'users:read',
  'apikeys:read',
  'reserved_names:read',
  'announcements:read',
  'audit:read',
];

const MODERATOR_PERMISSIONS: readonly string[] = [
  ...VIEWER_PERMISSIONS,
  'abuse:write',
  'inboxes:lookup',
  'inboxes:delete',
  'blocklist:write',
];

const ADMIN_PERMISSIONS: readonly string[] = [
  ...MODERATOR_PERMISSIONS,
  'domains:write',
  'settings:write',
  'users:write',
  'apikeys:write',
  'reserved_names:write',
  'announcements:write',
];

const OWNER_PERMISSIONS: readonly string[] = [...ADMIN_PERMISSIONS, 'admins:manage'];

const ROLE_PERMISSION_MAP: Readonly<Record<AdminRole, ReadonlySet<string>>> = {
  viewer: new Set(VIEWER_PERMISSIONS),
  moderator: new Set(MODERATOR_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  owner: new Set(OWNER_PERMISSIONS),
};

export function canAccess(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSION_MAP[role]?.has(permission) ?? false;
}

async function adminRequest<T>(
  path: string,
  options: {
    readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    readonly body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (method !== 'GET') {
    headers['x-requested-with'] = 'XMLHttpRequest';
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new AdminApiError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the TemporaMail backend API. Verify the server is running.',
    );
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errObj =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { code?: string; message?: string } }).error
        : undefined;
    const topMsg =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : undefined;

    const code = errObj?.code ?? `HTTP_${response.status}`;
    const message = errObj?.message ?? topMsg ?? `Request failed with status ${response.status}`;
    throw new AdminApiError(response.status, code, message);
  }

  return payload as T;
}

export const adminApi = {
  // --- Auth ---
  login(email: string, password: string): Promise<AdminLoginResponse> {
    return adminRequest<AdminLoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  loginMfa(mfaToken: string, code: string): Promise<AdminMfaResponse> {
    return adminRequest<AdminMfaResponse>('/auth/login/mfa', {
      method: 'POST',
      body: { mfaToken, code },
    });
  },

  logout(): Promise<{ readonly loggedOut: boolean }> {
    return adminRequest<{ readonly loggedOut: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },

  getMe(): Promise<{ readonly admin: AdminUser }> {
    return adminRequest<{ readonly admin: AdminUser }>('/auth/me');
  },

  // --- Dashboard ---
  getDashboard(): Promise<DashboardStats> {
    return adminRequest<DashboardStats>('/dashboard');
  },

  // --- Domains ---
  listDomains(): Promise<{ readonly domains: DomainRow[] }> {
    return adminRequest<{ readonly domains: DomainRow[] }>('/domains');
  },

  createDomain(input: {
    readonly name: string;
    readonly active?: boolean;
    readonly notes?: string;
  }): Promise<DomainRow> {
    return adminRequest<DomainRow>('/domains', {
      method: 'POST',
      body: input,
    });
  },

  // --- Blocklist ---
  listBlocklist(): Promise<{ readonly entries: BlocklistRow[] }> {
    return adminRequest<{ readonly entries: BlocklistRow[] }>('/blocklist');
  },

  addBlocklist(input: {
    readonly type: BlocklistEntryType;
    readonly value: string;
    readonly reason?: string;
  }): Promise<BlocklistRow> {
    return adminRequest<BlocklistRow>('/blocklist', {
      method: 'POST',
      body: input,
    });
  },

  deleteBlocklist(id: number): Promise<{ readonly deleted: boolean }> {
    return adminRequest<{ readonly deleted: boolean }>(`/blocklist/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Settings ---
  listSettings(): Promise<{ readonly settings: SettingRow[] }> {
    return adminRequest<{ readonly settings: SettingRow[] }>('/settings');
  },

  updateSetting(key: string, value: unknown): Promise<SettingRow> {
    return adminRequest<SettingRow>(`/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value },
    });
  },

  // --- Inbox Lookup & Takedown ---
  lookupInbox(address: string, reason: string): Promise<InboxLookupResult> {
    return adminRequest<InboxLookupResult>('/inboxes/lookup', {
      method: 'POST',
      body: { address, reason },
    });
  },

  deleteInbox(address: string): Promise<{ readonly deleted: boolean; readonly address: string }> {
    return adminRequest<{ readonly deleted: boolean; readonly address: string }>(
      `/inboxes/${encodeURIComponent(address)}`,
      { method: 'DELETE' },
    );
  },

  // --- Users ---
  searchUsers(q?: string): Promise<{ readonly users: ManagedUserRow[] }> {
    const query = q && q.trim().length > 0 ? `?q=${encodeURIComponent(q.trim())}` : '';
    return adminRequest<{ readonly users: ManagedUserRow[] }>(`/users${query}`);
  },

  banUser(id: string): Promise<{
    readonly user: ManagedUserRow;
    readonly sessionsDestroyed: number;
    readonly keysRevoked: number;
  }> {
    return adminRequest(`/users/${encodeURIComponent(id)}/ban`, {
      method: 'POST',
    });
  },

  unbanUser(id: string): Promise<{ readonly user: ManagedUserRow }> {
    return adminRequest(`/users/${encodeURIComponent(id)}/unban`, {
      method: 'POST',
    });
  },

  changeUserPlan(id: string, planId: 'free' | 'premium'): Promise<{ readonly user: ManagedUserRow }> {
    return adminRequest(`/users/${encodeURIComponent(id)}/plan`, {
      method: 'PATCH',
      body: { planId },
    });
  },

  forceLogoutUser(id: string): Promise<{ readonly sessionsDestroyed: number }> {
    return adminRequest(`/users/${encodeURIComponent(id)}/force-logout`, {
      method: 'POST',
    });
  },

  // --- API Keys ---
  searchApiKeys(prefix?: string): Promise<{ readonly apiKeys: ManagedApiKeyRow[] }> {
    const query =
      prefix && prefix.trim().length > 0 ? `?prefix=${encodeURIComponent(prefix.trim())}` : '';
    return adminRequest<{ readonly apiKeys: ManagedApiKeyRow[] }>(`/api-keys${query}`);
  },

  disableApiKey(id: string): Promise<{ readonly disabled: boolean }> {
    return adminRequest<{ readonly disabled: boolean }>(
      `/api-keys/${encodeURIComponent(id)}/disable`,
      { method: 'POST' },
    );
  },

  // --- Reserved Names ---
  listReservedNames(): Promise<{ readonly reservedNames: ReservedNameRow[] }> {
    return adminRequest<{ readonly reservedNames: ReservedNameRow[] }>('/reserved-names');
  },

  addReservedName(name: string, reason?: string): Promise<ReservedNameRow> {
    return adminRequest<ReservedNameRow>('/reserved-names', {
      method: 'POST',
      body: { name, ...(reason !== undefined ? { reason } : {}) },
    });
  },

  deleteReservedName(name: string): Promise<{ readonly deleted: boolean }> {
    return adminRequest<{ readonly deleted: boolean }>(
      `/reserved-names/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    );
  },

  // --- Announcements ---
  listAnnouncements(): Promise<{ readonly announcements: AnnouncementRow[] }> {
    return adminRequest<{ readonly announcements: AnnouncementRow[] }>('/announcements');
  },

  createAnnouncement(input: {
    readonly title: string;
    readonly body: string;
    readonly severity?: AnnouncementSeverity;
    readonly active?: boolean;
  }): Promise<AnnouncementRow> {
    return adminRequest<AnnouncementRow>('/announcements', {
      method: 'POST',
      body: input,
    });
  },

  updateAnnouncement(
    id: number,
    body: {
      readonly title?: string;
      readonly body?: string;
      readonly severity?: AnnouncementSeverity;
      readonly active?: boolean;
    },
  ): Promise<AnnouncementRow> {
    return adminRequest<AnnouncementRow>(`/announcements/${id}`, {
      method: 'PATCH',
      body,
    });
  },

  // --- Admin Users (Owner Only) ---
  listAdmins(): Promise<{ readonly admins: AdminUser[] }> {
    return adminRequest<{ readonly admins: AdminUser[] }>('/admins');
  },

  createAdmin(input: {
    readonly email: string;
    readonly password: string;
    readonly role: AdminRole;
  }): Promise<{ readonly admin: AdminUser }> {
    return adminRequest<{ readonly admin: AdminUser }>('/admins', {
      method: 'POST',
      body: input,
    });
  },

  updateAdmin(
    id: string,
    body: { readonly role?: AdminRole; readonly status?: 'active' | 'disabled' },
  ): Promise<{ readonly admin: AdminUser }> {
    return adminRequest<{ readonly admin: AdminUser }>(`/admins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    });
  },

  resetAdmin2fa(id: string): Promise<{ readonly reset: boolean }> {
    return adminRequest<{ readonly reset: boolean }>(
      `/admins/${encodeURIComponent(id)}/reset-2fa`,
      { method: 'POST' },
    );
  },

  // --- Audit Logs ---
  listAuditLogs(limit?: number): Promise<{ readonly logs: AuditLogRow[] }> {
    const query = limit !== undefined ? `?limit=${limit}` : '';
    return adminRequest<{ readonly logs: AuditLogRow[] }>(`/audit-logs${query}`);
  },
};
