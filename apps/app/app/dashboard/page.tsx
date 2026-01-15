import React from "react";
import { IsaakGreetingCard } from "@/components/isaak/IsaakGreetingCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightTicker } from "@/components/dashboard/InsightTicker";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <IsaakGreetingCard />

      <DashboardStats />

      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-1">
        <InsightTicker />
      </div>
    </div>
  );
}
