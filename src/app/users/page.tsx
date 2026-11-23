'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Ban,
  CheckCircle2,
  Crown,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type ManagedUserRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'users:write') : false;

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<ManagedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.searchUsers(searchTerm?.trim() || undefined);
      setUsers(res.users);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to load users',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void loadUsers(query);
  };

  const handleBan = async (user: ManagedUserRow) => {
    if (!canWrite) return;
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.banUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? res.user : u)),
      );
      setNotice(
        `Banned ${user.email} (${res.sessionsDestroyed} session(s) ended, ${res.keysRevoked} API key(s) revoked).`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to ban user',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleUnban = async (user: ManagedUserRow) => {
    if (!canWrite) return;
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.unbanUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? res.user : u)),
      );
      setNotice(`Unbanned ${user.email}.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to unban user',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePlan = async (
    user: ManagedUserRow,
    planId: 'free' | 'premium',
  ) => {
    if (!canWrite || user.planId === planId) return;
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.changeUserPlan(user.id, planId);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? res.user : u)),
      );
      setNotice(`Changed ${user.email} plan to ${planId}.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to change user plan',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleForceLogout = async (user: ManagedUserRow) => {
    if (!canWrite) return;
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.forceLogoutUser(user.id);
      setNotice(
        `Forced logout for ${user.email} (${res.sessionsDestroyed} session(s) terminated).`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to force logout user',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Users className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            Users Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search registered accounts, adjust plans, ban/unban abusers, or terminate active sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers(query)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canWrite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only view: your role does not have <code className="font-mono">users:write</code> permission.
        </div>
      )}

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

      <div className="tm-card rounded-2xl p-4 sm:p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by email address..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
      </div>

      <div className="tm-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Plan</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Verified</th>
                <th className="px-4 py-3.5">2FA</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isBusy = busyId === user.id;
                  const isBanned = user.status === 'banned';
                  const isDeleted = user.status === 'deleted';
                  const nextPlan: 'free' | 'premium' =
                    user.planId === 'premium' ? 'free' : 'premium';

                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {user.email}
                        </div>
                        <div className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {user.id}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            user.planId === 'premium'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {user.planId === 'premium' && <Crown className="h-3 w-3" />}
                          {user.planId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : user.status === 'banned'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {user.totpEnabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-sky-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                            <ShieldOff className="h-3.5 w-3.5" />
                            Off
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <div>{formatDate(user.lastLoginAt)}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          Joined {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!canWrite || isBusy || isDeleted}
                            onClick={() => void handleChangePlan(user, nextPlan)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                            title={`Switch plan to ${nextPlan}`}
                          >
                            <Crown className="h-3.5 w-3.5" />
                            Set {nextPlan}
                          </button>

                          <button
                            type="button"
                            disabled={!canWrite || isBusy || isDeleted}
                            onClick={() => void handleForceLogout(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
                            title="Terminate all active user sessions"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Force Logout
                          </button>

                          {isBanned ? (
                            <button
                              type="button"
                              disabled={!canWrite || isBusy}
                              onClick={() => void handleUnban(user)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canWrite || isBusy || isDeleted}
                              onClick={() => void handleBan(user)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Ban
                            </button>
                          )}
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
