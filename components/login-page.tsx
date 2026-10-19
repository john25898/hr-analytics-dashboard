"use client";

import React from "react";
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  LogIn,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticate, type AuthUser } from "@/lib/auth";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    // Simulate a tiny delay for a natural feel
    setTimeout(() => {
      const user = authenticate(email, password);
      setIsLoading(false);
      if (!user) {
        setError(
          "Invalid email or password. Check your credentials or contact Program HR.",
        );
        return;
      }
      onLogin(user);
    }, 350);
  };

  const quickFill = (mail: string, pw: string) => {
    setEmail(mail);
    setPassword(pw);
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900 px-4">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            UJTP HR Management System
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70">
            Human Resources for Health — Employee &amp; Leave Management
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use your CHAK staff credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@chak.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 pr-10 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </span>
              )}
            </Button>
          </form>

          {/* Demo account hint */}
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <User className="h-4 w-4" />
              HR Staff Access
            </div>
            <p className="mt-1 text-xs text-emerald-700/80">
              <span className="font-semibold">Patrick (HR):</span>{" "}
              patrick.mutua.karuti@chak.org
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  quickFill("patrick.mutua.karuti@chak.org", "Chak!GgbDZHt3")
                }
                className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Fill Patrick (HR)
              </button>
              <button
                type="button"
                onClick={() => quickFill("hr@chak.org", "Chak!PAFJRE25")}
                className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Fill Program HR
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-emerald-100/50">
          Authorized personnel only · CHAK UJTP Programme © 2026
        </p>
      </div>
    </div>
  );
}
