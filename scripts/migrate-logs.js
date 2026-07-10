#!/usr/bin/env node
/**
 * migrate-logs.js
 * ────────────────────────────────────────────────────────────────────────────
 * Migrates streak-counter exported data from the OLD log format (plain ISO
 * strings) to the NEW format ({ ts: string, date: string }).
 *
 * The `date` field is computed from the UTC timestamp using the CURRENT
 * system timezone — so run this script on the same device/timezone where
 * you originally logged the data (i.e. your phone's timezone set to IST).
 *
 * NOTE: The `tz` field (IANA timezone, e.g. "Asia/Kolkata") is NOT added by
 * this script — old entries don't carry that info. They'll display their time
 * in the current device timezone without a label. Only logs created AFTER
 * this update will show the original timezone (e.g. "2:15 PM IST").
 *
 *
 * Usage:
 *   node scripts/migrate-logs.js <input.json> [output.json]
 *
 * If output.json is omitted, it writes to <input>_migrated.json
 *
 * Example:
 *   node scripts/migrate-logs.js streak_backup.json streak_backup_migrated.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a UTC timestamp as YYYY-MM-DD in the LOCAL timezone. */
function toLocalDateStr(isoOrDate) {
  const d = new Date(isoOrDate);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Check if a value is already a LogEntry { ts, date }. */
function isLogEntry(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.ts   === 'string' &&
    typeof v.date === 'string'
  );
}

/** Migrate a single entry (string or LogEntry) → LogEntry. */
function migrateEntry(entry) {
  if (isLogEntry(entry)) {
    // Already migrated — pass through.
    return entry;
  }
  if (typeof entry === 'string') {
    // Old format: UTC ISO string  e.g. "2026-07-10T08:45:00.639Z"
    //         or: bare date string e.g. "2026-07-10"
    const ts   = entry.includes('T') ? entry : `${entry}T00:00:00.000Z`;
    const date = toLocalDateStr(ts);
    return { ts, date };
  }
  throw new Error(`Unexpected log entry shape: ${JSON.stringify(entry)}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const [,, inputArg, outputArg] = process.argv;

if (!inputArg) {
  console.error('Usage: node scripts/migrate-logs.js <input.json> [output.json]');
  process.exit(1);
}

const inputPath  = path.resolve(inputArg);
const outputPath = outputArg
  ? path.resolve(outputArg)
  : inputPath.replace(/(\.[^.]+)?$/, '_migrated$1');

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

// Show which timezone we'll use for date computation
const tzOffset = -new Date().getTimezoneOffset();
const tzSign   = tzOffset >= 0 ? '+' : '-';
const tzHrs    = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
const tzMins   = String(Math.abs(tzOffset) % 60).padStart(2, '0');
console.log(`\nTimezone: UTC${tzSign}${tzHrs}:${tzMins}  (dates will be computed in this timezone)\n`);

let data;
try {
  data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error(`Failed to parse JSON: ${e.message}`);
  process.exit(1);
}

if (!data.logs || typeof data.logs !== 'object') {
  console.error('No "logs" key found in the JSON — is this a valid streak-counter export?');
  process.exit(1);
}

// Migrate logs
const logs = data.logs;
let totalEntries    = 0;
let alreadyMigrated = 0;
let migrated        = 0;

for (const activityId of Object.keys(logs)) {
  const entries = logs[activityId];
  if (!Array.isArray(entries)) continue;

  const migratedEntries = entries.map((entry, i) => {
    totalEntries++;
    if (isLogEntry(entry)) {
      alreadyMigrated++;
      return entry;
    }
    migrated++;
    const result = migrateEntry(entry);
    // Verbose: show what changed
    const original = typeof entry === 'string' ? entry : JSON.stringify(entry);
    console.log(`  [${activityId.slice(-8)}] #${i + 1}: "${original}"  →  { ts: "${result.ts}", date: "${result.date}" }`);
    return result;
  });

  logs[activityId] = migratedEntries;
}

data.logs = logs;

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n────────────────────────────────────────────`);
console.log(`Total log entries : ${totalEntries}`);
console.log(`Already migrated  : ${alreadyMigrated}  (passed through unchanged)`);
console.log(`Freshly migrated  : ${migrated}`);
console.log(`\nOutput written to : ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`  1. Open the app → Settings → Export Data  (copy the JSON)`);
console.log(`  2. Save it as a .json file and run this script`);
console.log(`  3. Open the app → Settings → Import Data  (paste the migrated JSON)`);
console.log(`────────────────────────────────────────────\n`);
