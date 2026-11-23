'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Lock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type DomainRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function DomainsPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'domains:write') : false;

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { domains: rows } = await adminApi.listDomains();
      setDomains(rows);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to load domains.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canWrite) return;

    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName) {
      setError('Domain name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const created = await adminApi.createDomain({
        name: trimmedName,
        active,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setDomains((prev) => [...prev, created]);
      setName('');
      setNotes('');
      setActive(true);
      setSuccessMsg(`Added domain "${created.name}".`);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to create domain.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Mail Domains
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure disposable mail domains accepted by the TemporaMail SMTP server.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDomains()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Feedback banners */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Domain Form */}
      <section className="tm-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Add Domain
            </h2>
          </div>
          {!canWrite && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Read-only ({admin?.role ?? 'viewer'})
            </span>
          )}
        </div>

        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label
              htmlFor="domain-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Domain Name
            </label>
            <input
              id="domain-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. mail.temporamail.org"
              disabled={!canWrite || submitting}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="domain-notes"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Notes (optional)
            </label>
            <input
              id="domain-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="DNS provider, MX status, or usage notes"
              disabled={!canWrite || submitting}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-end justify-between gap-3 md:col-span-3">
            <label className="inline-flex cursor-pointer items-center gap-2 py-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={!canWrite || submitting}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              Active
            </label>

            <button
              type="submit"
              disabled={!canWrite || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </section>

      {/* Domains Table */}
      <section className="tm-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Configured Domains
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {domains.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Domain</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading domains…
                  </td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No domains configured yet.
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr
                    key={domain.id}
                    className="transition hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      #{domain.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                      {domain.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      {domain.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="max-w-md truncate px-6 py-3.5 text-slate-600 dark:text-slate-300">
                      {domain.notes || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(domain.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
