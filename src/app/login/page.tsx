'use client';

import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Lock,
  Mail,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { adminApi, AdminApiError } from '@/lib/adminApi';

type LoginStep = 'credentials' | 'mfa' | 'recovery';

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, loading, refresh } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    readonly secret: string;
    readonly otpauthUrl: string;
  } | null>(null);
  const [totpQrDataUrl, setTotpQrDataUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<readonly string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!totpSetup?.otpauthUrl) {
      setTotpQrDataUrl('');
      return;
    }
    void QRCode.toDataURL(totpSetup.otpauthUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#09090b', light: '#ffffff' },
    })
      .then(setTotpQrDataUrl)
      .catch(() => setTotpQrDataUrl(''));
  }, [totpSetup]);

  useEffect(() => {
    if (!loading && admin && step !== 'recovery') {
      router.replace('/');
    }
  }, [admin, loading, step, router]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.login(email.trim(), password);
      setMfaToken(res.mfaToken);
      setSetupRequired(res.setupRequired);
      setTotpSetup(res.totpSetup ?? null);
      setTotpCode('');
      setStep('mfa');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.loginMfa(mfaToken, totpCode.trim());
      await refresh();
      if (res.recoveryCodes && res.recoveryCodes.length > 0) {
        setRecoveryCodes(res.recoveryCodes);
        setStep('recovery');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Invalid 2FA verification code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tm-hero-bg relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Toggle color theme"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon className="h-3.5 w-3.5 text-indigo-600" />
            <span>Dark</span>
          </>
        )}
      </button>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <img
            src="/images/admin-logo.svg"
            alt="TemporaMail Admin"
            className="mb-3 h-12 w-12 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            TemporaMail Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Restricted operations console · Mandatory 2FA
          </p>
        </div>

        <div className="tm-card rounded-2xl p-6 sm:p-7">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
                >
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@temporamail.local"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="admin-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{submitting ? 'Verifying…' : 'Continue to 2FA'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/80 p-3.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-sky-400" />
                <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {setupRequired ? (
                    <>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        First-Time 2FA Enrollment Required
                      </p>
                      <p className="mt-0.5">
                        Add this secret to your authenticator app, then enter the 6-digit code to
                        complete enrollment.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Two-Factor Verification
                      </p>
                      <p className="mt-0.5">
                        Enter the 6-digit TOTP code from your authenticator app or a recovery code.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {setupRequired && totpSetup && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-700">
                      {totpQrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={totpQrDataUrl}
                          alt="Admin 2FA Authenticator QR code"
                          className="h-full w-full"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Generating QR…</span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Scan with Google Authenticator, 1Password, Apple Passwords, or Authy
                    </p>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        Manual TOTP Secret
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyText('secret', totpSetup.secret)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-sky-400"
                      >
                        {copiedKey === 'secret' ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:bg-slate-950 dark:text-sky-300">
                      {totpSetup.secret}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="totp-code"
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
                >
                  {setupRequired ? '6-Digit Verification Code' : 'TOTP or Recovery Code'}
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="totp-code"
                    type="text"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 font-mono text-sm tracking-widest text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{submitting ? 'Verifying…' : 'Verify & Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {step === 'recovery' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                  <p className="font-semibold">Save Your One-Time Recovery Codes</p>
                  <p className="mt-0.5">
                    These codes are shown only once. Store them in a secure password manager in case
                    you lose access to your authenticator device.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {recoveryCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-center dark:bg-slate-950"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void copyText('recovery', recoveryCodes.join('\n'))}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {copiedKey === 'recovery' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy All
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-colors hover:bg-blue-700"
                >
                  <span>Continue to Console</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          All administrative actions are logged to the immutable audit trail.
        </p>
      </div>
    </div>
  );
}
