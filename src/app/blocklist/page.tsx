'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  ShieldBan,
  Trash2,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type BlocklistEntryType,
  type BlocklistRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

type TabFilter = 'all' | BlocklistEntryType;

const TABS: readonly { readonly id: TabFilter; readonly label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sender', label: 'Sender' },
  { id: 'domain', label: 'Domain' },
  { id: 'ip', label: 'IP' },
  { id: 'keyword', label: 'Keyword' },
];

const TYPE_BADGE_STYLES: Record<BlocklistEntryType, string> = {
  sender:
    'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  domain:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  ip:
    'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  keyword:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function BlocklistPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'blocklist:write') : false;

  const [entries, setEntries] = useState<BlocklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [type, setType] = useState<BlocklistEntryType>('sender');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadBlocklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { entries: rows } = await adminApi.listBlocklist();
      setEntries(rows);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to load blocklist entries.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocklist();
  }, [loadBlocklist]);

  const countsByTab = useMemo(() => {
    const counts: Record<TabFilter, number> = {
      all: entries.length,
      sender: 0,
      domain: 0,
      ip: 0,
      keyword: 0,
    };
    for (const entry of entries) {
      counts[entry.type] += 1;
    }
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (activeTab === 'all') return entries;
    return entries.filter((entry) => entry.type === activeTab);
  }, [entries, activeTab]);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canWrite) return;

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError('Value is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const created = await adminApi.addBlocklist({
        type,
        value: trimmedValue,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setEntries((prev) => [created, ...prev]);
      setValue('');
      setReason('');
      setSuccessMsg(`Added ${created.type} blocklist entry "${created.value}".`);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to add blocklist entry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entry: BlocklistRow) => {
    if (!canWrite) return;
    setDeletingId(entry.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.deleteBlocklist(entry.id);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setSuccessMsg(`Removed "${entry.value}" from blocklist.`);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to delete blocklist entry.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Blocklist
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reject spam and abusive traffic by sender address, domain, IP, or keyword.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadBlocklist()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Banners */}
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

      {/* Add Entry Form */}
      <section className="tm-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Add Blocklist Entry
            </h2>
          </div>
          {!canWrite && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Read-only ({admin?.role ?? 'viewer'})
            </span>
          )}
        </div>

        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-2">
            <label
              htmlFor="blocklist-type"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Type
            </label>
            <select
              id="blocklist-type"
              value={type}
              onChange={(e) => setType(e.target.value as BlocklistEntryType)}
              disabled={!canWrite || submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="sender">Sender</option>
              <option value="domain">Domain</option>
              <option value="ip">IP</option>
              <option value="keyword">Keyword</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="blocklist-value"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Value
            </label>
            <input
              id="blocklist-value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                type === 'sender'
                  ? 'spammer@example.com'
                  : type === 'domain'
                    ? 'bad-domain.xyz'
                    : type === 'ip'
                      ? '203.0.113.42'
                      : 'phishing-phrase'
              }
              disabled={!canWrite || submitting}
              required
              maxLength={320}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="blocklist-reason"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Reason (optional)
            </label>
            <input
              id="blocklist-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated credential stuffing / spam flood"
              disabled={!canWrite || submitting}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={!canWrite || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Adding…' : 'Block'}
            </button>
          </div>
        </form>
      </section>

      {/* Tabs + Entries Table */}
      <section className="tm-card overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {countsByTab[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldBan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Showing {filteredEntries.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Added</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading blocklist…
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No blocklist entries in this category.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${TYPE_BADGE_STYLES[entry.type]}`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                      {entry.value}
                    </td>
                    <td className="max-w-md truncate px-6 py-3.5 text-slate-600 dark:text-slate-300">
                      {entry.reason || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry)}
                        disabled={!canWrite || deletingId === entry.id}
                        title={canWrite ? 'Delete blocklist entry' : 'Requires blocklist:write'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === entry.id ? 'Removing…' : 'Delete'}
                      </button>
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
