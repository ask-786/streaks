#!/usr/bin/env node
/**
 * migrate-logs.js
 * ────────────────────────────────────────────────────────────────────────────
 * Migrates streak-counter exported data to the new { ts, date, tz } format.
 *
 * What it does:
 *   1. Converts plain ISO string log entries  →  { ts, date, tz }
 *   2. Stamps tz on already-migrated entries that are missing it
 *   3. Stamps tz on note entries that have a non-null time field
 *
 * The `date` is computed in the CURRENT system timezone (must match where
 * you originally logged — run this on IST if all data is from India).
 * The `tz` field is set to the system's IANA timezone name (e.g. "Asia/Kolkata"),
 * or you can override it with: --tz Asia/Kolkata
 *
 * Usage:
 *   node scripts/migrate-logs.js <input.json> [output.json] [--tz Asia/Kolkata]
 *
 * Example:
 *   node scripts/migrate-logs.js backup.json backup_migrated.json
 *   node scripts/migrate-logs.js backup.json backup_migrated.json --tz Asia/Kolkata
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Parse args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const tzFlagIdx = args.indexOf('--tz');
let tzOverride = null;
if (tzFlagIdx !== -1 && args[tzFlagIdx + 1]) {
  tzOverride = args[tzFlagIdx + 1];
  args.splice(tzFlagIdx, 2);
}
const [inputArg, outputArg] = args;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Detect the system IANA timezone name, e.g. "Asia/Kolkata". */
function getSystemTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Format a UTC timestamp as YYYY-MM-DD in the LOCAL (system) timezone. */
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

/**
 * Migrate a single log entry (string or LogEntry) → LogEntry with tz.
 * Also stamps tz on entries that already have ts+date but are missing tz.
 */
function migrateLogEntry(entry, tz) {
  if (isLogEntry(entry)) {
    // Already migrated — just ensure tz is present
    if (!entry.tz) return { ...entry, tz };
    return entry;
  }
  if (typeof entry === 'string') {
    const ts   = entry.includes('T') ? entry : `${entry}T00:00:00.000Z`;
    const date = toLocalDateStr(ts);
    return { ts, date, tz };
  }
  throw new Error(`Unexpected log entry shape: ${JSON.stringify(entry)}`);
}

/**
 * Stamp tz on a NoteEntry that has a non-null time but no tz yet.
 */
function migrateNoteEntry(entry, tz) {
  if (entry.time && !entry.tz) return { ...entry, tz };
  return entry;
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (!inputArg) {
  console.error('Usage: node scripts/migrate-logs.js <input.json> [output.json] [--tz Asia/Kolkata]');
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

// Resolve target timezone
const tz = tzOverride || getSystemTz();

// Show which timezone we'll use
const tzOffset = -new Date().getTimezoneOffset();
const tzSign   = tzOffset >= 0 ? '+' : '-';
const tzHrs    = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
const tzMins   = String(Math.abs(tzOffset) % 60).padStart(2, '0');
console.log(`\nTimezone  : ${tz} (UTC${tzSign}${tzHrs}:${tzMins})`);
console.log(`tz field  : "${tz}" will be stamped on all entries\n`);

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

// ─── Migrate logs ───────────────────────────────────────────────────────────

const logs = data.logs;
let totalLogEntries  = 0;
let alreadyMigrated  = 0;
let newlyMigrated    = 0;
let tzStamped        = 0;

for (const activityId of Object.keys(logs)) {
  const entries = logs[activityId];
  if (!Array.isArray(entries)) continue;

  const migratedEntries = entries.map((entry, i) => {
    totalLogEntries++;
    const wasMigrated = isLogEntry(entry);
    const hadTz = wasMigrated && !!entry.tz;
    const result = migrateLogEntry(entry, tz);

    if (!wasMigrated) {
      newlyMigrated++;
      const original = typeof entry === 'string' ? entry : JSON.stringify(entry);
      console.log(`  [log][${activityId.slice(-8)}] #${i + 1}: "${original}"`);
      console.log(`       → { ts: "${result.ts}", date: "${result.date}", tz: "${result.tz}" }`);
    } else if (!hadTz) {
      tzStamped++;
    }
    return result;
  });

  logs[activityId] = migratedEntries;
}

data.logs = logs;

// ─── Migrate notes ──────────────────────────────────────────────────────────

let notesTzStamped = 0;

if (data.notes && typeof data.notes === 'object') {
  for (const activityId of Object.keys(data.notes)) {
    const actNotes = data.notes[activityId];
    if (!actNotes || typeof actNotes !== 'object') continue;
    for (const dateStr of Object.keys(actNotes)) {
      const entries = actNotes[dateStr];
      if (!Array.isArray(entries)) continue;
      data.notes[activityId][dateStr] = entries.map(entry => {
        const result = migrateNoteEntry(entry, tz);
        if (result !== entry) notesTzStamped++;
        return result;
      });
    }
  }
}

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n────────────────────────────────────────────`);
console.log(`Log entries total    : ${totalLogEntries}`);
console.log(`  Newly migrated     : ${newlyMigrated}  (string → { ts, date, tz })`);
console.log(`  tz stamped only    : ${tzStamped}  (already had ts+date, added tz)`);
console.log(`  Already complete   : ${totalLogEntries - newlyMigrated - tzStamped}`);
console.log(`Note entries updated : ${notesTzStamped}  (added tz to timestamped notes)`);
console.log(`\nOutput written to : ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`  1. In the app → Settings → Import Data`);
console.log(`  2. Paste the contents of: ${outputPath}`);
console.log(`────────────────────────────────────────────\n`);
