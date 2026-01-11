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

// 10 vs 11 invoices boundary
check({ invoices: 10, movements: 0, bankingEnabled: false }, 19);
check({ invoices: 11, movements: 0, bankingEnabled: false }, 23);

// 50 vs 51 invoices boundary
check({ invoices: 50, movements: 0, bankingEnabled: false }, 23);
check({ invoices: 51, movements: 0, bankingEnabled: false }, 25);

// 0 vs 1 movements boundary (banking enabled)
check({ invoices: 10, movements: 0, bankingEnabled: true }, 19);
check({ invoices: 10, movements: 1, bankingEnabled: true }, 22);

// 100 vs 101 movements boundary (banking enabled)
check({ invoices: 10, movements: 100, bankingEnabled: true }, 22);
check({ invoices: 10, movements: 101, bankingEnabled: true }, 24);

console.log("pricing-smoke OK");
