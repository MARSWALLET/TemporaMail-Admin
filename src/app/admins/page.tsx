'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCog,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type AdminRole,
  type AdminUser,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

const ROLES: AdminRole[] = ['owner', 'admin', 'moderator', 'viewer'];

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function AdminsPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const canManage = admin ? canAccess(admin.role, 'admins:manage') : false;

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAdmins();
      setAdmins(res.admins);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to load admin users',
      );
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    if (!authLoading) {
      void loadAdmins();
    }
  }, [authLoading, loadAdmins]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.createAdmin({
        email: email.trim(),
        password,
        role,
      });
      setAdmins((prev) => [res.admin, ...prev]);
      setEmail('');
      setPassword('');
      setRole('moderator');
      setNotice(
        `Created admin account ${res.admin.email} (${res.admin.role}). Mandatory 2FA enrollment will be prompted on first login.`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to create admin user',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (target: AdminUser, nextRole: AdminRole) => {
    if (!canManage || target.role === nextRole) return;
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.updateAdmin(target.id, { role: nextRole });
      setAdmins((prev) =>
        prev.map((a) => (a.id === target.id ? res.admin : a)),
      );
      setNotice(`Updated ${target.email} role to ${nextRole}.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to update admin role',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (target: AdminUser) => {
    if (!canManage) return;
    const nextStatus: 'active' | 'disabled' =
      target.status === 'active' ? 'disabled' : 'active';
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.updateAdmin(target.id, { status: nextStatus });
      setAdmins((prev) =>
        prev.map((a) => (a.id === target.id ? res.admin : a)),
      );
      setNotice(
        `${nextStatus === 'disabled' ? 'Disabled' : 'Re-activated'} admin ${target.email}.`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to update admin status',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReset2fa = async (target: AdminUser) => {
    if (!canManage) return;
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    try {
      await adminApi.resetAdmin2fa(target.id);
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === target.id ? { ...a, totpEnabled: false } : a,
        ),
      );
      setNotice(
        `Reset 2FA for ${target.email} and terminated active sessions. They must re-enroll TOTP on next login.`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to reset admin 2FA',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="tm-card flex items-center justify-center rounded-2xl p-12 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
        Verifying permissions...
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="tm-card rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Admin user management is restricted to <strong className="font-semibold text-slate-800 dark:text-slate-200">owner</strong> accounts with <code className="font-mono">admins:manage</code> permission.
          </p>
          {admin && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Signed in as {admin.email} ({admin.role})
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <UserCog className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            Admin Users
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Owner-only governance for panel operators, RBAC roles, account status, and mandatory TOTP 2FA resets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAdmins()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </div>
      )}

      <div className="tm-card rounded-2xl p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Create Admin Account
        </h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label
              htmlFor="admin-email"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@temporamail.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Temporary Password (min 10 chars)
            </label>
            <input
              id="admin-password"
              type="password"
              required
              minLength={10}
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong password..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="admin-role"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Role
            </label>
            <select
              id="admin-role"
              disabled={submitting}
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm capitalize text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || !email.trim() || password.length < 10}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="tm-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <th className="px-4 py-3.5">Admin</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">2FA</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
                    Loading admin accounts...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No admin users found.
                  </td>
                </tr>
              ) : (
                admins.map((row) => {
                  const isSelf = admin?.id === row.id;
                  const isBusy = busyId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="transition hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                          {row.email}
                          {isSelf && (
                            <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 uppercase dark:bg-blue-950/70 dark:text-sky-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {row.id}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          aria-label={`Role for ${row.email}`}
                          disabled={isBusy}
                          value={row.role}
                          onChange={(e) =>
                            void handleUpdateRole(row, e.target.value as AdminRole)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium capitalize text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            row.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.totpEnabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-sky-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <ShieldOff className="h-3.5 w-3.5" />
                            Pending Setup
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <div>{formatDate(row.lastLoginAt)}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          Created {formatDate(row.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleStatus(row)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              row.status === 'active'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                            }`}
                          >
                            {row.status === 'active' ? 'Disable' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleReset2fa(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset 2FA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
