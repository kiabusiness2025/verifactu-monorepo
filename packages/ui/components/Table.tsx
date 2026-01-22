import React from "react";

export type TableProps = { children: React.ReactNode; className?: string };

export function Table({ children, className = "" }: TableProps) {
  return <table className={"w-full text-sm " + className}>{children}</table>;
}

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <thead className={className}>{children}</thead>;

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <tbody className={className}>{children}</tbody>;

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <th className={"px-4 py-2 text-left font-medium " + className}>{children}</th>;

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <tr className={className}>{children}</tr>;

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <td className={"px-4 py-2 " + className}>{children}</td>;
