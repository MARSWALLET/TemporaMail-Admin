'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Info,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type AnnouncementRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

type Severity = 'info' | 'warning' | 'critical';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function severityBadge(severity: Severity) {
  switch (severity) {
    case 'critical':
      return {
        className:
          'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
        Icon: ShieldAlert,
      };
    case 'warning':
      return {
        className:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        Icon: AlertTriangle,
      };
    default:
      return {
        className:
          'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
        Icon: Info,
      };
  }
}

export default function AnnouncementsPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'announcements:write') : false;

  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [active, setActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAnnouncements();
      setAnnouncements(res.announcements);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to load announcements',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminApi.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        severity,
        active,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setTitle('');
      setBody('');
      setSeverity('info');
      setActive(false);
      setNotice(`Created announcement "${created.title}".`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to create announcement',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AnnouncementRow) => {
    if (!canWrite) return;
    setTogglingId(item.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminApi.updateAnnouncement(item.id, {
        active: !item.active,
      });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? updated : a)),
      );
      setNotice(
        `Announcement "${updated.title}" is now ${updated.active ? 'active' : 'inactive'}.`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Failed to update announcement',
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Megaphone className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            Announcements
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Publish system banners, maintenance notices, and incident alerts to users.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnnouncements()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canWrite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only view: your role does not have <code className="font-mono">announcements:write</code> permission.
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
          Create Announcement
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-12">
            <div className="sm:col-span-8">
              <label
                htmlFor="announcement-title"
                className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Title
              </label>
              <input
                id="announcement-title"
                type="text"
                required
                maxLength={150}
                disabled={!canWrite || submitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled SMTP maintenance window"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="announcement-severity"
                className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Severity
              </label>
              <select
                id="announcement-severity"
                disabled={!canWrite || submitting}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="announcement-body"
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Body
            </label>
            <textarea
              id="announcement-body"
              required
              rows={3}
              maxLength={2000}
              disabled={!canWrite || submitting}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the announcement details shown to users..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                disabled={!canWrite || submitting}
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
              />
              Publish immediately (active)
            </label>

            <button
              type="submit"
              disabled={!canWrite || submitting || !title.trim() || !body.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Announcement
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="tm-card rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600 dark:text-sky-400" />
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="tm-card rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No announcements created yet.
          </div>
        ) : (
          announcements.map((item) => {
            const { className, Icon } = severityBadge(item.severity);
            const isToggling = togglingId === item.id;
            return (
              <div
                key={item.id}
                className="tm-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.severity}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      #{item.id}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {item.body}
                  </p>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Created {formatDate(item.createdAt)} · Updated{' '}
                    {formatDate(item.updatedAt)}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.active ? 'Active' : 'Off'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    aria-label={`Toggle announcement ${item.title}`}
                    disabled={!canWrite || isToggling}
                    onClick={() => void handleToggleActive(item)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                      item.active
                        ? 'bg-blue-600 dark:bg-sky-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                        item.active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
