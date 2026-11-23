'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  KeyRound,
  Lock,
  Mail,
  Paperclip,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  canAccess,
  type InboxLookupResult,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/components/AdminAuthProvider';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function InboxLookupPage() {
  const { admin } = useAdminAuth();
  const canLookup = admin ? canAccess(admin.role, 'inboxes:lookup') : false;
  const canDelete = admin ? canAccess(admin.role, 'inboxes:delete') : false;

  const [address, setAddress] = useState('');
  const [reason, setReason] = useState('');
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);

  const [result, setResult] = useState<InboxLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reasonTrimmedLen = reason.trim().length;
  const isReasonValid = reasonTrimmedLen >= 5;

  const handleLookup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canLookup) return;

    const trimmedAddress = address.trim();
    const trimmedReason = reason.trim();

    if (!trimmedAddress.includes('@')) {
      setError('Please enter a valid email address containing "@".');
      return;
    }
    if (trimmedReason.length < 5) {
      setError('A mandatory audit reason of at least 5 characters is required.');
      return;
    }

    setSearching(true);
    setError(null);
    setSuccessMsg(null);
    setConfirmDelete(false);
    setExpandedMsgId(null);
    try {
      const data = await adminApi.lookupInbox(trimmedAddress, trimmedReason);
      setResult(data);
    } catch (err) {
      setResult(null);
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to look up inbox.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteInbox = async () => {
    if (!canDelete || !result) return;
    setDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.deleteInbox(result.address);
      setSuccessMsg(`Inbox "${res.address}" has been taken down and permanently deleted.`);
      setResult(null);
      setConfirmDelete(false);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Failed to delete inbox.');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (admin && !canLookup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Inbox Lookup
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit-logged inbox inspection and abuse takedown.
          </p>
        </div>

        <div className="tm-card flex flex-col items-center rounded-2xl px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Lock className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
            Access Denied
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Your role (<span className="font-semibold uppercase">{admin.role}</span>) does not have
            the <code className="font-mono text-xs">inboxes:lookup</code> permission. Only
            moderators, admins, and owners can inspect inboxes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Audit-Logged Inbox Lookup
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Inspect active anonymous or account inboxes for abuse investigations and execute takedowns.
        </p>
      </div>

      {/* Mandatory Audit Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div>
          <span className="font-semibold">Audit Trail Enforced:</span> Every lookup is permanently
          logged with your admin identity, IP address, target inbox, and investigation reason.
        </div>
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

      {/* Lookup Form */}
      <section className="tm-card rounded-2xl p-6">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <label
                htmlFor="lookup-address"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Inbox Email Address
              </label>
              <input
                id="lookup-address"
                type="email"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="target@temporamail.org"
                disabled={!canLookup || searching}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-5">
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="lookup-reason"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Mandatory Audit Reason
                </label>
                <span
                  className={`text-[11px] font-medium ${
                    isReasonValid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {reasonTrimmedLen}/5 min chars
                </span>
              </div>
              <input
                id="lookup-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Abuse ticket #4821 — phishing report"
                disabled={!canLookup || searching}
                required
                minLength={5}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={!canLookup || searching || !isReasonValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {searching ? 'Looking up…' : 'Lookup'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Lookup Result */}
      {result && (
        <div className="space-y-4">
          {/* Inbox Metadata + Takedown Card */}
          <section className="tm-card rounded-2xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                    {result.address}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      result.store === 'postgres_account'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    {result.store === 'postgres_account'
                      ? 'Account (PostgreSQL)'
                      : 'Anonymous (Redis)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Expires: {formatDate(result.expiresAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {result.messages.length}{' '}
                    {result.messages.length === 1 ? 'message' : 'messages'}
                  </span>
                  {result.userId && (
                    <span className="font-mono">User ID: {result.userId}</span>
                  )}
                </div>
              </div>

              {/* Abuse Takedown Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={!canDelete || deleting}
                    title={
                      canDelete
                        ? 'Permanently delete inbox for abuse takedown'
                        : 'Requires inboxes:delete'
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Inbox
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-1.5 dark:border-red-800 dark:bg-red-950/60">
                    <span className="px-2 text-xs font-semibold text-red-700 dark:text-red-300">
                      Confirm takedown?
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteInbox()}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Messages List */}
          <section className="tm-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Messages
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {result.messages.length} total
              </span>
            </div>

            {result.messages.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                This inbox currently has no messages.
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                {result.messages.map((msg) => {
                  const isExpanded = expandedMsgId === msg.id;
                  return (
                    <div key={msg.id} className="px-6 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {msg.subject || '(No subject)'}
                            </h3>
                            {msg.otp && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                                <KeyRound className="h-3 w-3" />
                                OTP: {msg.otp}
                              </span>
                            )}
                            {msg.spamFlagged && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                Spam ({msg.spamScore})
                              </span>
                            )}
                            {msg.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <Paperclip className="h-3 w-3" />
                                {msg.attachments.length}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              From:{' '}
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {msg.from}
                              </span>
                            </span>
                            <span>{formatDate(msg.date)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                          className="self-start rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
                        >
                          {isExpanded ? 'Hide Body' : 'View Body'}
                        </button>
                      </div>

                      {isExpanded && (
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100/90 p-4 font-mono text-xs text-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
                          {msg.text || '(No plain-text body)'}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
