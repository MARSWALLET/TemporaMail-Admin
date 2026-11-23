'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
  RefreshCw,
  Save,
  Sliders,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type SettingRow,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

const SETTING_KEY_REGEX = /^[a-z0-9_]+$/;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatJsonValue(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function SettingsPage() {
  const { admin } = useAdminAuth();
  const canWrite = admin ? canAccess(admin.role, 'settings:write') : false;

  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { settings: rows } = await adminApi.listSettings();
      setSettings(rows);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to load live settings.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLoadIntoForm = (row: SettingRow) => {
    setKeyInput(row.key);
    setValueInput(formatJsonValue(row.value));
    setError(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canWrite) return;

    const trimmedKey = keyInput.trim();
    if (!SETTING_KEY_REGEX.test(trimmedKey)) {
      setError('Setting key must contain only lowercase letters, digits, and underscores.');
      return;
    }

    const trimmedValue = valueInput.trim();
    if (!trimmedValue) {
      setError('Value is required (enter valid JSON, a number, boolean, or quoted string).');
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(trimmedValue);
    } catch {
      setError(
        'Invalid JSON value. Use valid JSON syntax (e.g. 60, true, "text", or {"limit": 100}).',
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await adminApi.updateSetting(trimmedKey, parsedValue);
      setSettings((prev) => {
        const exists = prev.some((row) => row.key === updated.key);
        if (exists) {
          return prev.map((row) => (row.key === updated.key ? updated : row));
        }
        return [...prev, updated].sort((a, b) => a.key.localeCompare(b.key));
      });
      setSuccessMsg(`Updated live setting "${updated.key}".`);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to update setting.');
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
            Live Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Runtime configuration overrides applied immediately without restarting the server.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSettings()}
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

      {/* Quick-update Form */}
      <section className="tm-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Quick Update Setting
            </h2>
          </div>
          {!canWrite && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Read-only ({admin?.role ?? 'viewer'})
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <label
                htmlFor="setting-key"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Setting Key
              </label>
              <input
                id="setting-key"
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="e.g. inbox_ttl_seconds"
                disabled={!canWrite || submitting}
                required
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div className="md:col-span-8">
              <label
                htmlFor="setting-value"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                JSON / Number Value
              </label>
              <textarea
                id="setting-value"
                rows={3}
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder='Examples: 3600, true, "enabled", or {"maxPerHour": 50}'
                disabled={!canWrite || submitting}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canWrite || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving…' : 'Save Setting'}
            </button>
          </div>
        </form>
      </section>

      {/* Settings List */}
      <section className="tm-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Current Settings
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {settings.length} keys
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="px-6 py-3">Key</th>
                <th className="px-6 py-3">Value (JSON)</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading live settings…
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No live settings overrides stored yet.
                  </td>
                </tr>
              ) : (
                settings.map((row) => (
                  <tr
                    key={row.key}
                    className="align-top transition hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">
                      {row.key}
                    </td>
                    <td className="px-6 py-3.5">
                      <pre className="max-w-xl overflow-x-auto rounded-lg bg-slate-100/90 px-3 py-2 font-mono text-xs text-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
                        {formatJsonValue(row.value)}
                      </pre>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleLoadIntoForm(row)}
                        disabled={!canWrite}
                        title={canWrite ? 'Load into editor' : 'Requires settings:write'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
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
