"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  BarChart3,
  Users,
  AlertCircle,
  MapPin,
  Users2,
  TrendingUp,
  Lightbulb,
  Building2,
  Briefcase,
  Zap,
  FileText,
  Trash2,
  Heart,
  ArrowLeftRight,
  DollarSign,
  Clock,
  CalendarDays,
  FileSpreadsheet,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-gate";

interface NavigationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/compliance", label: "Compliance", icon: AlertCircle },
  { href: "/disabilities", label: "Disabilities", icon: Heart },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/departed", label: "Departed", icon: Trash2 },
  { href: "/counties", label: "Counties", icon: MapPin },
  { href: "/regulatory-bodies", label: "Reg Bodies", icon: Building2 },
  { href: "/experience", label: "Experience", icon: Clock },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/leave", label: "Leave", icon: CalendarDays },
  { href: "/timesheets", label: "Timesheets", icon: FileSpreadsheet },
  { href: "/payroll", label: "Payroll", icon: DollarSign },
  { href: "/layworkers", label: "Layworkers", icon: Users2 },
];

export function Navigation({ open, onOpenChange }: NavigationProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-sidebar transition-all duration-300 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h1 className="text-xl font-bold text-sidebar-foreground">
              UJTP HR
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="md:hidden h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4 text-xs text-sidebar-foreground/60">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-sidebar-foreground/50" />
              <div className="min-w-0">
                <p className="truncate font-medium text-sidebar-foreground/80">
                  {user.name}
                </p>
                <p className="truncate">
                  {user.role === "hr" ? "HR Officer" : "Program HR"} ·{" "}
                  {user.jobTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/";
              }}
              className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
            <p className="mt-3">UJTP Health Records</p>
            <p className="mt-1">Employee Management System</p>
          </div>
        </div>
      </aside>
    </>
  );
}
