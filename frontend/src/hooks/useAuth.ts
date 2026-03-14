import { useCallback, useEffect, useMemo, useState } from "react";

import { get } from "../lib/apiClient";
import type { User } from "../lib/types";

export const AUTH_TOKEN_KEY = "securemeet_auth_token";

export const useAuth = () => {
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
      setLoading(false);
      return;
    }

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

  return {
    token,
    user,
    loading,
    isAuthenticated,
    setToken,
    clearToken,
  };
};
