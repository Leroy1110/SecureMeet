import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  loadUser: (tokenOverride?: string | null) => Promise<void>;
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
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setUser(null);
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setTokenState(null);
    setUser(null);
    setLoading(false);
  }, []);

  const loadUser = useCallback(
    async (tokenOverride?: string | null) => {
      const activeToken = tokenOverride ?? tokenRef.current;

      if (!activeToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const currentUser = await get<User>("/auth/me", {
          Authorization: `Bearer ${activeToken}`,
        });

        setUser(currentUser);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    },
    [clearToken]
  );

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
