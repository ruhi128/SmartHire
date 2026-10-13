#!/usr/bin/env node

/**
 * One-shot trusted worker for Expo push receipts.
 *
 * Schedule this command every 15 minutes (or run it manually after a test)
 * from the same private environment as the backend. It reads server-only
 * Supabase credentials from backend/.env; no mobile credential is involved.
 */
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

function expoPushIsEnabled() {
  return String(process.env.EXPO_PUSH_ENABLED || '').trim().toLowerCase() === 'true';
}

async function main() {
  // Lazily load the backend utility only when enabled. This lets a disabled
  // local/staged scheduler safely no-op without requiring Supabase variables.
  if (!expoPushIsEnabled()) {
    console.log('Expo push receipt worker: skipped (EXPO_PUSH_ENABLED is not true).');
    return;
  }

  const { processExpoPushReceipts } = require('../utils/expoPush');
  const result = await processExpoPushReceipts();
  console.log(
    `Expo push receipt worker: checked=${result.checked}, completed=${result.completed}, `
    + `pruned=${result.pruned}, deferred=${result.deferred}, unresolved=${result.unresolved}.`,
  );
}

main().catch((error) => {
  // Keep credentials, Expo tokens, ticket IDs, and notification content out
  // of scheduler output. Operators can diagnose configuration privately.
  console.error('Expo push receipt worker failed:', error?.message || 'unknown error');
  process.exitCode = 1;
});
