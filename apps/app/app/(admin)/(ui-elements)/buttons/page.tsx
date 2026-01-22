"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@verifactu/ui";
import { BoxIcon } from "@/icons";
import React from "react";

export default function Buttons() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Buttons" />
      <div className="space-y-5 sm:space-y-6">
        {/* Primary Button */}
        <ComponentCard title="Primary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              Button Text
            </Button>
            <Button size="md" variant="primary">
              Button Text
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title="Primary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              <span className="inline-flex items-center gap-2">
                <BoxIcon />
                Button Text
              </span>
            </Button>
            <Button size="md" variant="primary">
              <span className="inline-flex items-center gap-2">
                <BoxIcon />
                Button Text
              </span>
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Primary Button with Start Icon */}
        <ComponentCard title="Primary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              <span className="inline-flex items-center gap-2">
                Button Text
                <BoxIcon />
              </span>
            </Button>
            <Button size="md" variant="primary">
              <span className="inline-flex items-center gap-2">
                Button Text
                <BoxIcon />
              </span>
            </Button>
          </div>
        </ComponentCard>
        {/* Secondary Button */}
        <ComponentCard title="Secondary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="secondary">
              Button Text
            </Button>
            <Button size="md" variant="secondary">
              Button Text
            </Button>
          </div>
        </ComponentCard>
        {/* Secondary Button with Left Icon */}
        <ComponentCard title="Secondary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="secondary">
              <span className="inline-flex items-center gap-2">
                <BoxIcon />
                Button Text
              </span>
            </Button>
            <Button size="md" variant="secondary">
              <span className="inline-flex items-center gap-2">
                <BoxIcon />
                Button Text
              </span>
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Secondary Button with Right Icon */}
        <ComponentCard title="Secondary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="secondary">
              <span className="inline-flex items-center gap-2">
                Button Text
                <BoxIcon />
              </span>
            </Button>
            <Button size="md" variant="secondary">
              <span className="inline-flex items-center gap-2">
                Button Text
                <BoxIcon />
              </span>
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
