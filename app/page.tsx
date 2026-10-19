"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { DashboardContent } from "@/components/dashboard-content";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-screen bg-background">
      <Navigation open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-card px-4 py-3 shadow-sm md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">HR Management</h1>
        </header>

        <DashboardContent />
      </main>
    </div>
  );
}
