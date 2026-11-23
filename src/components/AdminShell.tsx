'use client';

import {
  AtSign,
  Ban,
  FileSearch,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { canAccess, type AdminRole } from '@/lib/adminApi';

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly permission?: string;
  readonly section: 'operations' | 'governance';
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'operations' },
  { href: '/domains', label: 'Domains', icon: Globe, permission: 'domains:read', section: 'operations' },
  { href: '/blocklist', label: 'Blocklist', icon: Ban, permission: 'blocklist:read', section: 'operations' },
  { href: '/settings', label: 'Settings', icon: Settings, permission: 'settings:read', section: 'operations' },
  { href: '/lookup', label: 'Inbox Lookup', icon: FileSearch, permission: 'inboxes:lookup', section: 'operations' },
  { href: '/users', label: 'Users', icon: Users, permission: 'users:read', section: 'governance' },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound, permission: 'apikeys:read', section: 'governance' },
  { href: '/reserved-names', label: 'Reserved Names', icon: AtSign, permission: 'reserved_names:read', section: 'governance' },
  { href: '/announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements:read', section: 'governance' },
  { href: '/admins', label: 'Admin Users', icon: ShieldCheck, permission: 'admins:manage', section: 'governance' },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText, permission: 'audit:read', section: 'governance' },
];

const ROLE_BADGE_STYLES: Readonly<Record<AdminRole, string>> = {
  owner:
    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
  admin:
    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
  moderator:
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
  viewer:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, logout } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !admin && !isLoginRoute) {
      router.replace('/login');
    }
  }, [admin, loading, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading || !admin) {
    return (
      <div className="tm-hero-bg flex min-h-screen items-center justify-center p-6">
        <div className="tm-card flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Verifying admin session…</span>
        </div>
      </div>
    );
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || canAccess(admin.role, item.permission),
  );
  const opsItems = visibleItems.filter((item) => item.section === 'operations');
  const govItems = visibleItems.filter((item) => item.section === 'governance');

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const renderNavSection = (title: string, items: readonly NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          {title}
        </p>
        {items.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/images/admin-logo.svg"
              alt="TemporaMail Admin"
              className="h-8 w-8 shrink-0"
            />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                TemporaMail
              </p>
              <p className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase dark:text-sky-400">
                Admin Console
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-5">
          {renderNavSection('Operations', opsItems)}
          {renderNavSection('Governance', govItems)}
        </nav>
      </div>

      <div className="mt-6 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
            {admin.email}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${ROLE_BADGE_STYLES[admin.role]}`}
            >
              {admin.role}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">2FA Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#060b18] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200/90 bg-white p-4 lg:block dark:border-slate-800/80 dark:bg-slate-950/80">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden dark:border-slate-800/80 dark:bg-[#060b18]/90">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/images/admin-logo.svg" alt="TemporaMail Admin" className="h-6 w-6" />
            <span className="text-sm font-bold">TemporaMail Admin</span>
          </div>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${ROLE_BADGE_STYLES[admin.role]}`}
          >
            {admin.role}
          </span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
