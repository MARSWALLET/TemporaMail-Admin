'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type ReservedNameRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function ReservedNamesPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'reserved_names:write') : false;

  const [items, setItems] = useState<ReservedNameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadNames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listReservedNames();
      setItems(res.reservedNames);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to load reserved names',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNames();
  }, [loadNames]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminApi.addReservedName(
        trimmedName,
        reason.trim() || 'admin_reserved',
      );
      setItems((prev) =>
        [...prev.filter((item) => item.name !== created.name), created].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setName('');
      setReason('');
      setNotice(`Reserved local-part "${created.name}".`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to add reserved name',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (targetName: string) => {
    if (!canWrite) return;
    setDeletingName(targetName);
    setError(null);
    setNotice(null);
    try {
      await adminApi.deleteReservedName(targetName);
      setItems((prev) => prev.filter((item) => item.name !== targetName));
      setNotice(`Removed "${targetName}" from reserved names.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to delete reserved name',
      );
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            Reserved Names
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Block sensitive inbox local-parts (e.g. <code className="font-mono">admin</code>, <code className="font-mono">support</code>, <code className="font-mono">security</code>) from public registration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadNames()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canWrite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only view: your role does not have <code className="font-mono">reserved_names:write</code> permission.
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

      <div className="tm-card rounded-2xl p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Add Reserved Name
        </h2>
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label
              htmlFor="reserved-name-input"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Local-part Name
            </label>
            <input
              id="reserved-name-input"
              type="text"
              required
              maxLength={64}
              disabled={!canWrite || submitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. postmaster"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="sm:col-span-6">
            <label
              htmlFor="reserved-reason-input"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Reason
            </label>
            <input
              id="reserved-reason-input"
              type="text"
              maxLength={200}
              disabled={!canWrite || submitting}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. System / anti-phishing protection"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={!canWrite || submitting || !name.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="tm-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <th className="px-4 py-3.5">Reserved Name</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Added</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
                    Loading reserved names...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No reserved names configured yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isDeleting = deletingName === item.name;
                  return (
                    <tr
                      key={item.name}
                      className="transition hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <code className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-sky-300">
                          {item.name}
                        </code>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {item.reason}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={!canWrite || isDeleting}
                          onClick={() => void handleDelete(item.name)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
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
