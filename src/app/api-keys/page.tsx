'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Ban,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type ManagedApiKeyRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function ApiKeysPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'apikeys:write') : false;

  const [prefix, setPrefix] = useState('');
  const [apiKeys, setApiKeys] = useState<ManagedApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadApiKeys = useCallback(async (searchPrefix?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.searchApiKeys(searchPrefix?.trim() || undefined);
      setApiKeys(res.apiKeys);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Failed to load API keys',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void loadApiKeys(prefix);
  };

  const handleDisable = async (key: ManagedApiKeyRow) => {
    if (!canWrite || key.revokedAt) return;
    setBusyId(key.id);
    setError(null);
    setNotice(null);
    try {
      await adminApi.disableApiKey(key.id);
      const now = new Date().toISOString();
      setApiKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, revokedAt: now } : k)),
      );
      setNotice(`Disabled API key "${key.name}" (${key.keyPrefix}...${key.last4}).`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to disable API key',
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
            <KeyRound className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            API Keys
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inspect issued developer API keys by prefix and immediately revoke compromised or abusive keys.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadApiKeys(prefix)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canWrite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only view: your role does not have <code className="font-mono">apikeys:write</code> permission.
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
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Search API keys by key prefix (e.g. tm_live_)..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <th className="px-4 py-3.5">Name / Owner</th>
                <th className="px-4 py-3.5">Key</th>
                <th className="px-4 py-3.5">Scopes</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
                    Loading API keys...
                  </td>
                </tr>
              ) : apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No API keys found.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => {
                  const isRevoked = Boolean(key.revokedAt);
                  const isBusy = busyId === key.id;
                  return (
                    <tr
                      key={key.id}
                      className="transition hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {key.name}
                        </div>
                        <div className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          User: {key.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-sky-300">
                          {key.keyPrefix}••••{key.last4}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.length === 0 ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : (
                            key.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-sky-300"
                              >
                                {scope}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isRevoked ? (
                          <div>
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Revoked
                            </span>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {formatDate(key.revokedAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={!canWrite || isRevoked || isBusy}
                          onClick={() => void handleDisable(key)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {isRevoked ? 'Disabled' : 'Disable'}
                        </button>
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
