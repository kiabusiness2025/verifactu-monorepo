import * as React from "react";
import { cn } from "../lib/utils";

export function SectionTitle({
  title,
  right,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="text-xs tracking-widest text-muted-foreground">{title.toUpperCase()}</div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
