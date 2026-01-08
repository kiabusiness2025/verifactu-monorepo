import assert from "node:assert/strict";
import { estimateNetEur, normalizeInput } from "../app/lib/pricing/calc.js";

function check(input, expected) {
  const value = estimateNetEur(normalizeInput(input));
  assert.equal(
    value,
    expected,
    `Expected ${expected} but got ${value} for ${JSON.stringify(input)}`
  );
}

// 50 vs 51 invoices boundary
check({ companies: 1, invoices: 50, movements: 0, bankingEnabled: false }, 19);
check({ companies: 1, invoices: 51, movements: 0, bankingEnabled: false }, 25);

// 0 vs 1 movements boundary (banking enabled)
check({ companies: 1, invoices: 50, movements: 0, bankingEnabled: true }, 19);
check({ companies: 1, invoices: 50, movements: 1, bankingEnabled: true }, 25);

console.log("pricing-smoke OK");
