'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Globe,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Sliders,
  Users,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type AdminRole,
  type DashboardStats,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  owner:
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70',
  admin:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70',
  moderator:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70',
  viewer:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to load dashboard telemetry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const rejectionEntries = stats
    ? Object.entries(stats.rejectionsByReason).sort((a, b) => b[1] - a[1])
    : [];
  const totalRejections = rejectionEntries.reduce((sum, [, count]) => sum + count, 0);
  const maxRejectionCount = rejectionEntries.length > 0 ? rejectionEntries[0][1] : 0;

  const canLookup = admin ? canAccess(admin.role, 'inboxes:lookup') : false;

  const quickLinks = [
    {
      href: '/domains',
      title: 'Domains',
      description: 'Inspect active mail domains and provision new receiving domains.',
      icon: Globe,
      accent: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
      allowed: true,
    },
    {
      href: '/blocklist',
      title: 'Blocklist',
      description: 'Manage blocked senders, domains, IPs, and spam keywords.',
      icon: ShieldBan,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
      allowed: true,
    },
    {
      href: '/lookup',
      title: 'Inbox Lookup',
      description: 'Audit-logged inbox inspection and abuse takedown controls.',
      icon: Search,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
      allowed: canLookup,
    },
    {
      href: '/users',
      title: 'Users',
      description: 'Search user accounts, update plans, ban, or revoke sessions.',
      icon: Users,
      accent: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
      allowed: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Operations Dashboard
            </h1>
            {admin && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${ROLE_BADGE_STYLES[admin.role]}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {admin.role}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time SMTP throughput, rejection breakdown, and mail operations overview.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="tm-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Emails Last Hour
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {loading ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ) : (
              (stats?.emailsLastHour ?? 0).toLocaleString()
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Accepted SMTP messages processed in the past 60 minutes
          </p>
        </div>

        <div className="tm-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rejections Last Hour
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {loading ? (
              <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ) : (
              totalRejections.toLocaleString()
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {rejectionEntries.length}{' '}
            {rejectionEntries.length === 1 ? 'reason category' : 'reason categories'}
          </p>
        </div>

        <div className="tm-card rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Last Snapshot
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            {loading ? (
              <span className="inline-block h-6 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ) : stats?.timestamp ? (
              formatTimestamp(stats.timestamp)
            ) : (
              '—'
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Signed in as <span className="font-mono">{admin?.email ?? '—'}</span>
          </p>
        </div>
      </div>

      {/* Rejections by Reason Bar Breakdown */}
      <section className="tm-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Rejections by Reason (Last Hour)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total: {totalRejections.toLocaleString()}
          </span>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : rejectionEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              No SMTP rejections recorded in the last hour.
            </div>
          ) : (
            <div className="space-y-4">
              {rejectionEntries.map(([reason, count]) => {
                const sharePct =
                  totalRejections > 0 ? Math.round((count / totalRejections) * 100) : 0;
                const widthPct =
                  maxRejectionCount > 0 ? Math.max(4, Math.round((count / maxRejectionCount) * 100)) : 0;

                return (
                  <div key={reason} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                        {reason}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {count.toLocaleString()} ({sharePct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Quick Operations
          </h2>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Sliders className="h-3.5 w-3.5" />
            Live Settings
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="tm-card group flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-500/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {!item.allowed && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Restricted
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all dark:text-blue-400">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
