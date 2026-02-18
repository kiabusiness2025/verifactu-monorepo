import type { ReactNode } from "react";

type Props = {
  title: string;
  right?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, right, className }: Props) {
  return (
    <div className={["flex items-center justify-between", className].filter(Boolean).join(" ")}>
      <div className="text-xs tracking-widest text-muted-foreground">{title.toUpperCase()}</div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
