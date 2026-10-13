// utils/expoPush.js
// Best-effort Android/iOS delivery through the Expo Push Service. The database
// notification row is created first and remains SmartHire's source of truth;
// an Expo/FCM failure must never make the originating workflow fail.

const axios = require('axios');
const supabase = require('../config/supabase');

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_PUSH_CHUNK_SIZE = 100;
const EXPO_RECEIPT_CHUNK_SIZE = 1000;
const RECEIPT_INITIAL_DELAY_MS = 15 * 60 * 1000;
const RECEIPT_RECHECK_DELAY_MS = 15 * 60 * 1000;
const MAX_RECEIPT_CHECK_ATTEMPTS = 4;
const EXPO_REQUEST_MAX_ATTEMPTS = 3;
const EXPO_RETRY_BASE_DELAY_MS = 250;
const ANDROID_CHANNEL_ID = 'smarthire-updates';
const EXPO_TOKEN_PATTERN = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

function isExpoPushEnabled() {
  return String(process.env.EXPO_PUSH_ENABLED || '').trim().toLowerCase() === 'true';
}

function isExpoPushToken(value) {
  return typeof value === 'string' && EXPO_TOKEN_PATTERN.test(value.trim());
}

function clippedText(value, limit) {
  return String(value ?? '').trim().slice(0, limit);
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableExpoRequestError(error) {
  const status = Number(error?.response?.status);
  // Axios exposes no response for connection resets, DNS failures, and
  // timeouts. Expo recommends bounded retry for those, 429, and 5xx errors.
  return !status || status === 429 || status >= 500;
}

async function postToExpo(endpoint, payload) {
  let lastError;
  for (let attempt = 0; attempt < EXPO_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await axios.post(endpoint, payload, {
        timeout: 10000,
        headers: expoHeaders(),
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableExpoRequestError(error) || attempt === EXPO_REQUEST_MAX_ATTEMPTS - 1) break;
      await sleep(EXPO_RETRY_BASE_DELAY_MS * (2 ** attempt));
    }
  }
  throw lastError;
}

function expoHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Expo Push access-token security is optional. If the release owner enables
  // it in EAS/Expo, keep the token only in the server's secret environment;
  // never expose it to the mobile app or an EXPO_PUBLIC_* value.
  const accessToken = String(process.env.EXPO_PUSH_ACCESS_TOKEN || '').trim();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function ticketErrorCode(ticket) {
  return clippedText(ticket?.details?.error, 120);
}

function normalizeTickets(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === 'object' ? [value] : [];
}

function buildMessage(device, notification) {
  const title = clippedText(notification.title, 180) || 'SmartHire update';
  const body = clippedText(notification.body, 900) || 'Open SmartHire to view this update.';

  // Keep the payload deliberately small and free of notification metadata.
  // The app re-fetches the authenticated inbox for the authoritative content.
  return {
    to: device.expo_push_token,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: ANDROID_CHANNEL_ID,
    data: {
      notificationId: String(notification.id),
      link: clippedText(notification.link, 600),
      type: clippedText(notification.type || 'system', 80),
      recipientUserId: String(notification.user_id),
    },
  };
}

async function removeUnregisteredDeviceTokens(tokens, source = 'Expo') {
  const uniqueTokens = [...new Set((tokens || []).filter(isExpoPushToken))];
  if (!uniqueTokens.length) return 0;

  const { error } = await supabase
    .from('mobile_devices')
    .delete()
    .in('expo_push_token', uniqueTokens);
  if (error) throw error;

  // Do not log opaque device tokens. The next foreground registration will
  // restore a valid token if the device becomes eligible again.
  console.warn(`[expo-push] Removed ${uniqueTokens.length} unregistered device token(s) reported by ${source}.`);
  return uniqueTokens.length;
}

/**
 * Persist ticket IDs for the receipt worker. A ticket means Expo accepted the
 * request, not that FCM/APNs accepted delivery; receipts close that gap later.
 * This queue is intentionally separate from the durable user inbox.
 */
async function queueExpoPushReceiptJobs(jobs) {
  const rows = (jobs || [])
    .filter((job) => isExpoPushToken(job?.expo_push_token) && typeof job?.expo_ticket_id === 'string' && job.expo_ticket_id.trim())
    .map((job) => ({
      expo_ticket_id: job.expo_ticket_id.trim().slice(0, 256),
      expo_push_token: job.expo_push_token.trim(),
      available_after: job.available_after || new Date(Date.now() + RECEIPT_INITIAL_DELAY_MS).toISOString(),
    }));
  if (!rows.length) return 0;

  const { error } = await supabase
    .from('expo_push_receipt_jobs')
    .upsert(rows, { onConflict: 'expo_ticket_id' });
  if (error) throw error;
  return rows.length;
}

async function deleteReceiptJobs(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return 0;
  const { error } = await supabase
    .from('expo_push_receipt_jobs')
    .delete()
    .in('id', uniqueIds);
  if (error) throw error;
  return uniqueIds.length;
}

async function deferReceiptJob(job, now, reason) {
  const attempts = Math.max(0, Number(job?.check_attempts) || 0) + 1;
  const { error } = await supabase
    .from('expo_push_receipt_jobs')
    .update({
      check_attempts: attempts,
      last_checked_at: now.toISOString(),
      last_error: clippedText(reason, 400) || null,
      available_after: new Date(now.getTime() + RECEIPT_RECHECK_DELAY_MS).toISOString(),
    })
    .eq('id', job.id);
  if (error) throw error;
}

async function deferOrAbandonReceiptJob(job, now, reason, completedJobIds) {
  const nextAttempt = Math.max(0, Number(job?.check_attempts) || 0) + 1;
  if (nextAttempt >= MAX_RECEIPT_CHECK_ATTEMPTS) {
    completedJobIds.push(job.id);
    return 'unresolved';
  }
  await deferReceiptJob(job, now, reason);
  return 'deferred';
}

/**
 * Deliver persisted notifications to each registered device for the matching
 * user. Callers normally use scheduleExpoPushNotifications rather than await
 * this helper. Expo ticket IDs are queued for the receipt worker after a
 * successful acceptance response.
 */
async function sendExpoPushNotifications(notifications) {
  if (!isExpoPushEnabled()) return { enabled: false, attempted: 0 };

  const persisted = (notifications || []).filter((notification) => (
    notification?.id && notification?.user_id && notification?.title
  ));
  if (!persisted.length) return { enabled: true, attempted: 0, accepted: 0, rejected: 0, queuedReceipts: 0, pruned: 0 };

  const userIds = [...new Set(persisted.map((notification) => notification.user_id))];
  const { data: devices, error } = await supabase
    .from('mobile_devices')
    .select('expo_push_token, user_id, platform')
    .in('user_id', userIds);
  if (error) throw error;

  const notificationsByUser = new Map();
  for (const notification of persisted) {
    const existing = notificationsByUser.get(notification.user_id) || [];
    existing.push(notification);
    notificationsByUser.set(notification.user_id, existing);
  }

  // Keep the token alongside each outbound payload so a ticket or receipt can
  // safely retire only the token Expo identifies as no longer registered.
  const deliveries = [];
  for (const device of devices || []) {
    if (!isExpoPushToken(device?.expo_push_token)) continue;
    for (const notification of notificationsByUser.get(device.user_id) || []) {
      deliveries.push({
        expoPushToken: device.expo_push_token.trim(),
        message: buildMessage(device, notification),
      });
    }
  }
  if (!deliveries.length) return { enabled: true, attempted: 0, accepted: 0, rejected: 0, queuedReceipts: 0, pruned: 0 };

  let accepted = 0;
  let rejected = 0;
  let queuedReceipts = 0;
  let pruned = 0;
  const receiptJobs = [];
  const unregisteredTokens = [];
  const availableAfter = new Date(Date.now() + RECEIPT_INITIAL_DELAY_MS).toISOString();

  for (const batch of chunks(deliveries, EXPO_PUSH_CHUNK_SIZE)) {
    let response;
    try {
      response = await postToExpo(EXPO_PUSH_ENDPOINT, batch.map((item) => item.message));
    } catch (_error) {
      // Preserve successful earlier batches and let a later notification try
      // again. The inbox is already durable regardless of this best-effort
      // OS-delivery failure.
      rejected += batch.length;
      console.warn(`[expo-push] Expo send request failed after bounded retries for ${batch.length} delivery item(s).`);
      continue;
    }
    const tickets = normalizeTickets(response?.data?.data);
    const responseErrors = Array.isArray(response?.data?.errors) ? response.data.errors : [];
    if (responseErrors.length) rejected += responseErrors.length;

    for (let index = 0; index < batch.length; index += 1) {
      const ticket = tickets[index];
      const delivery = batch[index];
      if (ticket?.status === 'ok' && typeof ticket.id === 'string' && ticket.id.trim()) {
        accepted += 1;
        receiptJobs.push({
          expo_ticket_id: ticket.id,
          expo_push_token: delivery.expoPushToken,
          available_after: availableAfter,
        });
        continue;
      }

      rejected += 1;
      if (ticketErrorCode(ticket) === 'DeviceNotRegistered') {
        unregisteredTokens.push(delivery.expoPushToken);
      }
    }
  }

  // Receipt persistence and stale-token cleanup improve future alerts but must
  // never turn a successfully persisted inbox event into an API failure.
  if (receiptJobs.length) {
    try {
      queuedReceipts = await queueExpoPushReceiptJobs(receiptJobs);
    } catch (queueError) {
      console.warn('[expo-push] Could not queue push receipts. Apply migration 010 and run the receipt worker:', queueError?.message || 'unknown error');
    }
  }
  if (unregisteredTokens.length) {
    try {
      pruned = await removeUnregisteredDeviceTokens(unregisteredTokens, 'an Expo push ticket');
    } catch (cleanupError) {
      console.warn('[expo-push] Could not remove an unregistered device token:', cleanupError?.message || 'unknown error');
    }
  }

  if (rejected) {
    // Do not log tokens or notification bodies. Ticket errors are delivery
    // diagnostics only; users can still read the persisted inbox entry.
    console.warn(`[expo-push] Expo rejected ${rejected} delivery ticket(s).`);
  }
  return { enabled: true, attempted: deliveries.length, accepted, rejected, queuedReceipts, pruned };
}

/**
 * Look up due Expo push receipts and retire invalid device tokens. Run this
 * from the provided one-shot worker on a trusted scheduler (normally every
 * 15 minutes). A receipt with status "ok" only means FCM/APNs accepted it;
 * the persisted SmartHire inbox remains the delivery source of truth.
 */
async function processExpoPushReceipts({ now = new Date(), limit = EXPO_RECEIPT_CHUNK_SIZE } = {}) {
  if (!isExpoPushEnabled()) return { enabled: false, checked: 0, completed: 0, pruned: 0, deferred: 0, unresolved: 0 };

  const safeLimit = Math.max(1, Math.min(Math.floor(Number(limit) || EXPO_RECEIPT_CHUNK_SIZE), EXPO_RECEIPT_CHUNK_SIZE));
  const { data: jobs, error } = await supabase
    .from('expo_push_receipt_jobs')
    .select('id, expo_ticket_id, expo_push_token, check_attempts, created_at')
    .lte('available_after', now.toISOString())
    .order('available_after', { ascending: true })
    .limit(safeLimit);
  if (error) throw error;

  const dueJobs = (jobs || []).filter((job) => job?.id && job?.expo_ticket_id && isExpoPushToken(job?.expo_push_token));
  if (!dueJobs.length) return { enabled: true, checked: 0, completed: 0, pruned: 0, deferred: 0, unresolved: 0 };

  let completed = 0;
  let deferred = 0;
  let unresolved = 0;
  let pruned = 0;
  const completedJobIds = [];
  const unregisteredTokens = [];

  for (const batch of chunks(dueJobs, EXPO_RECEIPT_CHUNK_SIZE)) {
    let response;
    try {
      response = await postToExpo(EXPO_RECEIPTS_ENDPOINT, { ids: batch.map((job) => job.expo_ticket_id) });
    } catch (_error) {
      // Do not strand due rows or terminate all later receipt batches because
      // Expo is temporarily unavailable. Mark each row for the normal delayed
      // retry lifecycle without exposing ticket IDs or tokens in logs.
      console.warn(`[expo-push] Expo receipt request failed after bounded retries for ${batch.length} receipt job(s).`);
      for (const job of batch) {
        const outcome = await deferOrAbandonReceiptJob(job, now, 'Expo receipt request failed after bounded retries.', completedJobIds);
        if (outcome === 'deferred') deferred += 1;
        else unresolved += 1;
      }
      continue;
    }
    const receipts = response?.data?.data && typeof response.data.data === 'object' ? response.data.data : {};

    for (const job of batch) {
      const receipt = receipts[job.expo_ticket_id];
      if (receipt?.status === 'ok') {
        completedJobIds.push(job.id);
        completed += 1;
        continue;
      }

      const errorCode = ticketErrorCode(receipt);
      if (receipt?.status === 'error') {
        completedJobIds.push(job.id);
        completed += 1;
        if (errorCode === 'DeviceNotRegistered') unregisteredTokens.push(job.expo_push_token);
        else console.warn(`[expo-push] Expo receipt reported ${errorCode || 'an unspecified'} delivery error.`);
        continue;
      }

      // Expo normally has a receipt after 15 minutes. Avoid retaining an
      // unbounded queue if a receipt never appears; surface a count without
      // leaking ticket IDs or tokens into logs.
      const outcome = await deferOrAbandonReceiptJob(
        job,
        now,
        receipt ? 'Unexpected Expo receipt response.' : 'Expo receipt is not available yet.',
        completedJobIds,
      );
      if (outcome === 'deferred') deferred += 1;
      else unresolved += 1;
    }
  }

  // Retire DeviceNotRegistered tokens before deleting their receipt jobs. If
  // cleanup has a transient database failure, leave the job in place so the
  // next trusted worker run can safely try again.
  if (unregisteredTokens.length) pruned = await removeUnregisteredDeviceTokens(unregisteredTokens, 'an Expo push receipt');
  if (completedJobIds.length) await deleteReceiptJobs(completedJobIds);
  if (unresolved) console.warn(`[expo-push] ${unresolved} push receipt(s) were unavailable after ${MAX_RECEIPT_CHECK_ATTEMPTS} checks.`);

  return { enabled: true, checked: dueJobs.length, completed, pruned, deferred, unresolved };
}

/**
 * Fire-and-forget wrapper used after a successful notifications-table write.
 * All errors are contained so callers preserve their original transaction and
 * response semantics even if Expo/FCM is unavailable.
 */
function scheduleExpoPushNotifications(notifications) {
  if (!isExpoPushEnabled()) return;
  Promise.resolve()
    .then(() => sendExpoPushNotifications(notifications))
    .catch((error) => {
      console.warn('[expo-push] Delivery attempt failed; inbox record remains available:', error?.message || 'unknown error');
    });
}

module.exports = {
  ANDROID_CHANNEL_ID,
  EXPO_PUSH_ENDPOINT,
  EXPO_RECEIPTS_ENDPOINT,
  EXPO_PUSH_CHUNK_SIZE,
  EXPO_RECEIPT_CHUNK_SIZE,
  EXPO_REQUEST_MAX_ATTEMPTS,
  buildMessage,
  isExpoPushEnabled,
  isExpoPushToken,
  processExpoPushReceipts,
  queueExpoPushReceiptJobs,
  scheduleExpoPushNotifications,
  sendExpoPushNotifications,
};
