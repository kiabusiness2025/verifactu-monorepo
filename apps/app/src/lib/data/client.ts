import type { DataMode } from "./DataMode";
import { demoData } from "@/src/lib/demo/demoData";

export function getTenant(mode: DataMode) {
  if (mode === "demo") {
    return demoData.tenant;
  }
  return null;
}

export function getKpis(mode: DataMode) {
  if (mode === "demo") {
    return demoData.kpis;
  }
  return null;
}

export function getInvoices(mode: DataMode) {
  if (mode === "demo") {
    return demoData.invoices;
  }
  return [];
}

export function getPayments(mode: DataMode) {
  if (mode === "demo") {
    return demoData.payments;
  }
  return [];
}

export function getPnl(mode: DataMode) {
  if (mode === "demo") {
    return demoData.pnl;
  }
  return null;
}

export function getIsaakExamples(mode: DataMode) {
  if (mode === "demo") {
    return demoData.isaakExamples;
  }
  return [];
}
