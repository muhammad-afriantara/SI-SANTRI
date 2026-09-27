import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { apiRequest, ApiError } from "../utils/api";

export type Role = "siswa" | "guru" | "wali_murid";

type AuthState = {
  token: string | null;
  role: Role | null;
  profile: any | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (role: Role, identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const TOKEN_KEY = "si_santri_token";
const ROLE_KEY = "si_santri_role";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const storedToken = await storage.secureGet(TOKEN_KEY, null);
      const storedRole = (await storage.secureGet(ROLE_KEY, null)) as Role | null;
      if (storedToken && storedRole) {
        const me = await apiRequest("/auth/me", { token: storedToken });
        setToken(storedToken);
        setRole(storedRole);
        setProfile(me.profile);
      }
    } catch (e) {
      await storage.secureRemove(TOKEN_KEY);
      await storage.secureRemove(ROLE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (loginRole: Role, identifier: string, password: string) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { role: loginRole, identifier, password },
    });
    await storage.secureSet(TOKEN_KEY, data.access_token);
    await storage.secureSet(ROLE_KEY, data.role);
    setToken(data.access_token);
    setRole(data.role);
    setProfile(data.profile);
  }, []);

  const logout = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    await storage.secureRemove(ROLE_KEY);
    setToken(null);
    setRole(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const me = await apiRequest("/auth/me", { token });
    setProfile(me.profile);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, role, profile, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
