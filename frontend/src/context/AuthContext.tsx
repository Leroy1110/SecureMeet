import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { get } from "../lib/apiClient";
import type { User } from "../lib/types";

export const AUTH_TOKEN_KEY = "securemeet_auth_token";

export type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setToken: (newToken: string) => void;
  clearToken: () => void;
  loadUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setTokenState(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!storedToken) {
      setTokenState(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setTokenState(storedToken);

    try {
      const currentUser = await get<User>("/auth/me", {
        Authorization: `Bearer ${storedToken}`,
      });

      setUser(currentUser);
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, [clearToken]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      isAuthenticated,
      setToken,
      clearToken,
      loadUser,
    }),
    [token, user, loading, isAuthenticated, setToken, clearToken, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
