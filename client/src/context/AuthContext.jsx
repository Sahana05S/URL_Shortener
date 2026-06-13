import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(credentials) {
        const data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setUser(data.user);
      },
      async signup(details) {
        const data = await apiRequest("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(details),
        });
        setUser(data.user);
      },
      async logout() {
        await apiRequest("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
