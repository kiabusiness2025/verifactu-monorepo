import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import ts from "typescript";

const calcPath = path.resolve("apps/landing/app/lib/pricing/calc.ts");
const source = fs.readFileSync(calcPath, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
});

const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { estimateNetEur, normalizeInput } = await import(dataUrl);

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
check({ invoices: 11, movements: 0, bankingEnabled: false }, 24);

// 20 vs 21 invoices boundary
check({ invoices: 20, movements: 0, bankingEnabled: false }, 24);
check({ invoices: 21, movements: 0, bankingEnabled: false }, 29);

// 50 vs 51 invoices boundary
check({ invoices: 50, movements: 0, bankingEnabled: false }, 39);
check({ invoices: 51, movements: 0, bankingEnabled: false }, 44);

// 0 vs 1 movements boundary (banking enabled)
check({ invoices: 10, movements: 0, bankingEnabled: true }, 19);
check({ invoices: 10, movements: 1, bankingEnabled: true }, 24);

// 20 vs 21 movements boundary (banking enabled)
check({ invoices: 10, movements: 20, bankingEnabled: true }, 24);
check({ invoices: 10, movements: 21, bankingEnabled: true }, 29);

// 100 vs 101 movements boundary (banking enabled)
check({ invoices: 10, movements: 100, bankingEnabled: true }, 44);
check({ invoices: 10, movements: 101, bankingEnabled: true }, 54);

console.log("pricing-smoke OK");
