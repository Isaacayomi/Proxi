#!/usr/bin/env node

/**
 * ProxiCheck: Pre-Provision Faculty Verification Key
 *
 * Use this script to issue verification keys BEFORE lecturers sign up.
 * Keys can be distributed to faculty members by the Head of Department or Dean.
 *
 * Usage:
 *   node scripts/create-faculty-key.mjs --dept="Computer Science" --code="OAU-CSC-2026-CUSTOM"
 *   node scripts/create-faculty-key.mjs --dept="Mechanical Engineering" --single-use
 */

import { randomUUID } from "node:crypto";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dept: "Computer Science & Engineering",
    code: null,
    note: "Departmental Pre-Provisioned Key",
    singleUse: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--dept=")) {
      options.dept = arg.split("=")[1].replace(/['"]/g, "").trim();
    } else if (arg.startsWith("--code=")) {
      options.code = arg.split("=")[1].replace(/['"]/g, "").trim().toUpperCase();
    } else if (arg.startsWith("--note=")) {
      options.note = arg.split("=")[1].replace(/['"]/g, "").trim();
    } else if (arg === "--single-use") {
      options.singleUse = true;
    }
  }

  return options;
}

const opts = parseArgs();
const keyCode =
  opts.code ||
  `OAU-${opts.dept.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-2026`;
const maxUses = opts.singleUse ? 1 : "NULL";

console.log("\n=================================================");
console.log("  PROXICHECK FACULTY KEY PROVISIONING TOOL");
console.log("=================================================");
console.log(`Department: ${opts.dept}`);
console.log(`Key Code:   ${keyCode}`);
console.log(`Max Uses:   ${opts.singleUse ? "1 (Single-use)" : "Unlimited"}`);
console.log(`Note:       ${opts.note}`);
console.log("-------------------------------------------------");
console.log("\n1. Direct SQL to execute in Supabase SQL Editor:");
console.log(`
INSERT INTO public.faculty_verification_keys (key_code, department, note, max_uses, is_active)
VALUES ('${keyCode}', '${opts.dept}', '${opts.note}', ${maxUses}, TRUE)
ON CONFLICT (key_code) DO NOTHING;
`);
console.log("2. Or add to server environment variable (.env.local / hosting settings):");
console.log(`LECTURER_VERIFICATION_CODE=${keyCode}\n`);
console.log("=================================================\n");
