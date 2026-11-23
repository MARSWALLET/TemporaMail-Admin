'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { adminApi, type AdminUser } from '@/lib/adminApi';

interface AdminAuthContextValue {
  readonly admin: AdminUser | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<AdminUser | null>;
  readonly logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  admin: null,
  loading: true,
  refresh: async () => null,
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { readonly children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AdminUser | null> => {
    try {
      const { admin: current } = await adminApi.getMe();
      setAdmin(current);
      return current;
    } catch {
      setAdmin(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch {
      // Clear local state even if cookie was already expired
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refresh, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  return useContext(AdminAuthContext);
}
