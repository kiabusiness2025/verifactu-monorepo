"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Badge } from "@verifactu/ui";
import React from "react";

export default function BadgePage() {
  const variants = [
    { variant: "default", label: "Default" },
    { variant: "success", label: "Success" },
    { variant: "warning", label: "Warning" },
    { variant: "danger", label: "Danger" },
    { variant: "info", label: "Info" },
  ] as const;

  return (
    <div>
      <PageBreadcrumb pageTitle="Badges" />
      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Variants
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {variants.map((item) => (
                <Badge key={item.variant} variant={item.variant}>
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Variants (tight)
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {variants.map((item) => (
                <Badge
                  key={`tight-${item.variant}`}
                  variant={item.variant}
                  className="px-2 py-0.5 text-[11px]"
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
