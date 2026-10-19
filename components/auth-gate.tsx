"use client";

import React, { useEffect, useState } from "react";
import { LoginPage } from "@/components/login-page";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  loadSession,
  saveSession,
  clearSession,
  type AuthUser,
} from "@/lib/auth";

interface AuthGateProps {
  children: React.ReactNode;
}

const SESSION_CHANNEL = "ujtp-hr-session-change";

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    setUser(loadSession());
    setIsRestoring(false);

    // Keep multiple tabs in sync on login/logout
    const handler = () => {
      setUser(loadSession());
    };
    window.addEventListener("storage", handler);
    window.addEventListener(SESSION_CHANNEL, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(SESSION_CHANNEL, handler);
    };
  }, []);

  const handleLogin = (loggedIn: AuthUser) => {
    saveSession(loggedIn);
    setUser(loggedIn);
    window.dispatchEvent(new Event(SESSION_CHANNEL));
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    window.dispatchEvent(new Event(SESSION_CHANNEL));
  };

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900">
        <div className="flex items-center gap-3 text-emerald-100/70">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
          <span className="text-sm">Loading UJTP HR…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      {/* Global notification bell — visible on every page while signed in */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationsBell />
      </div>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Context for logout button in navigation ────────────────────────────────

interface AuthContextValue {
  user: AuthUser;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthGate");
  }
  return ctx;
}
