#!/usr/bin/env node

/**
 * Network-free contract check for protected Expo device registration/removal
 * and non-blocking Expo Push payload generation. No Firebase, Expo account,
 * HTTP server, or Supabase project is required to run this validator.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const validToken = 'ExponentPushToken[abc_DEF-123]';

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function createRouteSupabase() {
  const calls = [];
  return {
    calls,
    from(table) {
      const state = { table, operation: null, payload: null, options: null, filters: [] };
      const query = {
        select() { return this; },
        upsert(payload, options) {
          state.operation = 'upsert';
          state.payload = payload;
          state.options = options;
          calls.push(state);
          return this;
        },
        delete() {
          state.operation = 'delete';
          calls.push(state);
          return this;
        },
        eq(field, value) { state.filters.push([field, value]); return this; },
        order() { return this; },
        limit() { return this; },
        update() { return this; },
        insert() { return this; },
        single() {
          return Promise.resolve({
            data: state.operation === 'upsert' ? { id: 'device-1', platform: state.payload.platform, last_seen_at: '2026-10-11T00:00:00.000Z' } : null,
            error: null,
          });
        },
        then(resolve, reject) {
          const data = state.operation === 'delete' ? [{ id: 'device-1' }] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

function loadNotificationRoute() {
  const router = {
    getHandlers: {}, postHandlers: {}, patchHandlers: {}, deleteHandlers: {},
    get(routePath, ...handlers) { this.getHandlers[routePath] = handlers.at(-1); return this; },
    post(routePath, ...handlers) { this.postHandlers[routePath] = handlers.at(-1); return this; },
    patch(routePath, ...handlers) { this.patchHandlers[routePath] = handlers.at(-1); return this; },
    delete(routePath, ...handlers) { this.deleteHandlers[routePath] = handlers.at(-1); return this; },
  };
  const target = path.resolve(__dirname, '../routes/notifications.js');
  const originalLoad = Module._load;
  const supabase = createRouteSupabase();

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'express') return { Router: () => router };
    if (request === '../config/supabase' && parent?.filename === target) return supabase;
    if (request === '../middleware/auth' && parent?.filename === target) return (_req, _res, next) => next?.();
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    assert.equal(require(target), router);
    return { router, supabase };
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

function loadExpoPush({
  ticketResponses = [],
  receiptResponses = [],
  devices = [{ expo_push_token: validToken, user_id: 'student-1', platform: 'android' }],
} = {}) {
  const target = path.resolve(__dirname, '../utils/expoPush.js');
  const originalLoad = Module._load;
  const posts = [];
  const calls = [];
  const deviceRows = devices.map((item) => ({ ...item }));
  const receiptJobs = [];
  const queuedTickets = [...ticketResponses];
  const queuedReceipts = [...receiptResponses];
  let nextReceiptJobId = 1;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const supabase = {
    from(table) {
      if (table === 'mobile_devices') {
        const state = { operation: null };
        return {
          select() { state.operation = 'select'; return this; },
          delete() { state.operation = 'delete'; return this; },
          in(field, values) {
            calls.push({ table, operation: state.operation, field, values: [...values] });
            if (state.operation === 'select') return Promise.resolve({ data: clone(deviceRows), error: null });
            if (state.operation === 'delete') {
              const remove = new Set(values);
              for (let index = deviceRows.length - 1; index >= 0; index -= 1) {
                if (remove.has(deviceRows[index].expo_push_token)) deviceRows.splice(index, 1);
              }
              return Promise.resolve({ data: [], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
        };
      }

      if (table === 'expo_push_receipt_jobs') {
        const state = { operation: null, patch: null };
        return {
          upsert(rows, options) {
            calls.push({ table, operation: 'upsert', rows: clone(rows), options });
            rows.forEach((row) => {
              const index = receiptJobs.findIndex((job) => job.expo_ticket_id === row.expo_ticket_id);
              const next = { ...(index >= 0 ? receiptJobs[index] : { id: `receipt-job-${nextReceiptJobId++}`, check_attempts: 0, created_at: '2026-10-11T00:00:00.000Z' }), ...clone(row) };
              if (index >= 0) receiptJobs[index] = next;
              else receiptJobs.push(next);
            });
            return Promise.resolve({ data: null, error: null });
          },
          select() { state.operation = 'select'; return this; },
          lte() { return this; },
          order() { return this; },
          limit() { return Promise.resolve({ data: clone(receiptJobs), error: null }); },
          delete() { state.operation = 'delete'; return this; },
          update(patch) { state.operation = 'update'; state.patch = patch; return this; },
          in(field, values) {
            calls.push({ table, operation: state.operation, field, values: [...values] });
            if (state.operation === 'delete') {
              const remove = new Set(values);
              for (let index = receiptJobs.length - 1; index >= 0; index -= 1) {
                if (field === 'id' && remove.has(receiptJobs[index].id)) receiptJobs.splice(index, 1);
              }
            }
            return Promise.resolve({ data: [], error: null });
          },
          eq(field, value) {
            calls.push({ table, operation: state.operation, field, value, patch: state.patch });
            if (state.operation === 'update') {
              const job = receiptJobs.find((item) => item[field] === value);
              if (job) Object.assign(job, clone(state.patch));
            }
            return Promise.resolve({ data: [], error: null });
          },
        };
      }

      throw new Error(`Unexpected Supabase table: ${table}`);
    },
  };

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'axios' && parent?.filename === target) {
      return {
        post: async (endpoint, payload, options) => {
          posts.push([endpoint, payload, options]);
          if (endpoint.endsWith('/push/send')) {
            const next = queuedTickets.length
              ? queuedTickets.shift()
              : payload.map((_message, index) => ({ status: 'ok', id: `ticket-${index + 1}` }));
            return { data: { data: next } };
          }
          if (endpoint.endsWith('/push/getReceipts')) {
            return { data: { data: queuedReceipts.length ? queuedReceipts.shift() : {} } };
          }
          throw new Error(`Unexpected Expo endpoint: ${endpoint}`);
        },
      };
    }
    if (request === '../config/supabase' && parent?.filename === target) return supabase;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    return { expoPush: require(target), posts, calls, deviceRows, receiptJobs };
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

function loadNotify() {
  const target = path.resolve(__dirname, '../utils/notify.js');
  const originalLoad = Module._load;
  const scheduled = [];
  let persisted = false;
  const supabase = {
    from(table) {
      assert.equal(table, 'notifications');
      return {
        insert(payload) {
          this.payload = payload;
          return this;
        },
        select() { return this; },
        single: async () => {
          persisted = true;
          return {
            data: { id: 'notification-1', user_id: 'student-1', title: 'Application update', body: 'Reviewed', type: 'application', link: '/student/applications' },
            error: null,
          };
        },
      };
    },
  };

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === '../config/supabase' && parent?.filename === target) return supabase;
    if (request === './expoPush' && parent?.filename === target) {
      return {
        scheduleExpoPushNotifications: (rows) => {
          assert.equal(persisted, true, 'push scheduling must happen only after persistence');
          scheduled.push(rows);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    return { notify: require(target), scheduled };
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

async function run() {
  const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/010_add_expo_push_receipt_jobs.sql'), 'utf8');
  assert.match(migration, /create table if not exists public\.expo_push_receipt_jobs/i);
  assert.match(migration, /expo_ticket_id\s+text not null unique/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.expo_push_receipt_jobs from anon, authenticated/i);
  const worker = fs.readFileSync(path.resolve(__dirname, './process-expo-push-receipts.js'), 'utf8');
  assert.match(worker, /processExpoPushReceipts/);
  assert.equal(require('../package.json').scripts['process:expo-push-receipts'], 'node ./scripts/process-expo-push-receipts.js');

  const { router, supabase } = loadNotificationRoute();

  const register = createResponse();
  await router.postHandlers['/devices']({
    user: { id: 'student-1' },
    body: {
      // The handler must ignore a malicious body userId and use req.user.id.
      userId: 'admin-999',
      expoPushToken: validToken,
      platform: 'android',
      deviceName: 'Pixel test device',
      appVersion: '1.0.0',
    },
  }, register);
  assert.equal(register.statusCode, 201);
  assert.equal(register.body.device.platform, 'android');
  const registration = supabase.calls.find((call) => call.operation === 'upsert');
  assert.equal(registration.payload.user_id, 'student-1');
  assert.equal(registration.payload.expo_push_token, validToken);
  assert.equal(registration.options.onConflict, 'expo_push_token');

  const invalid = createResponse();
  await router.postHandlers['/devices']({
    user: { id: 'student-1' },
    body: { expoPushToken: 'not-an-expo-token', platform: 'android' },
  }, invalid);
  assert.equal(invalid.statusCode, 400);

  const remove = createResponse();
  await router.deleteHandlers['/devices']({
    user: { id: 'student-1' },
    body: { expoPushToken: validToken },
  }, remove);
  assert.equal(remove.statusCode, 200);
  assert.equal(remove.body.removed, true);
  const deletion = supabase.calls.find((call) => call.operation === 'delete');
  assert.deepEqual(deletion.filters, [['user_id', 'student-1'], ['expo_push_token', validToken]]);

  const previousGate = process.env.EXPO_PUSH_ENABLED;
  process.env.EXPO_PUSH_ENABLED = 'true';
  try {
    const { expoPush, posts, receiptJobs } = loadExpoPush({
      ticketResponses: [[{ status: 'ok', id: 'ticket-1' }]],
      receiptResponses: [{ 'ticket-1': { status: 'ok' } }],
    });
    const result = await expoPush.sendExpoPushNotifications([{
      id: 'notification-1',
      user_id: 'student-1',
      title: 'Application update',
      body: 'Your application moved to review.',
      type: 'application',
      link: '/student/applications',
    }]);
    assert.equal(result.attempted, 1);
    assert.equal(result.accepted, 1);
    assert.equal(result.queuedReceipts, 1);
    assert.equal(posts.length, 1);
    const [endpoint, messages] = posts[0];
    assert.equal(endpoint, expoPush.EXPO_PUSH_ENDPOINT);
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0].data, {
      notificationId: 'notification-1',
      link: '/student/applications',
      type: 'application',
      recipientUserId: 'student-1',
    });
    assert.equal(messages[0].channelId, expoPush.ANDROID_CHANNEL_ID);
    assert.equal(receiptJobs.length, 1);
    assert.equal(receiptJobs[0].expo_ticket_id, 'ticket-1');
    assert.equal(receiptJobs[0].expo_push_token, validToken);

    const receiptResult = await expoPush.processExpoPushReceipts({ now: new Date('2026-10-11T00:30:00.000Z') });
    assert.equal(receiptResult.checked, 1);
    assert.equal(receiptResult.completed, 1);
    assert.equal(receiptResult.pruned, 0);
    assert.equal(receiptJobs.length, 0);
    assert.equal(posts[1][0], expoPush.EXPO_RECEIPTS_ENDPOINT);
    assert.deepEqual(posts[1][1], { ids: ['ticket-1'] });

    const delayedReceipt = loadExpoPush({
      ticketResponses: [[{ status: 'ok', id: 'ticket-delayed' }]],
      receiptResponses: [{}, { 'ticket-delayed': { status: 'ok' } }],
    });
    await delayedReceipt.expoPush.sendExpoPushNotifications([{
      id: 'notification-delayed', user_id: 'student-1', title: 'Delayed receipt', body: 'Waiting for Expo',
    }]);
    // Make the queued row due in this network-free test, then verify a missing
    // receipt moves it through the 15-minute retry lifecycle instead of losing it.
    delayedReceipt.receiptJobs[0].available_after = '2026-10-11T00:30:00.000Z';
    const delayedFirstCheck = await delayedReceipt.expoPush.processExpoPushReceipts({ now: new Date('2026-10-11T00:30:00.000Z') });
    assert.equal(delayedFirstCheck.deferred, 1);
    assert.equal(delayedFirstCheck.unresolved, 0);
    assert.equal(delayedReceipt.receiptJobs.length, 1);
    assert.equal(delayedReceipt.receiptJobs[0].check_attempts, 1);
    assert.equal(delayedReceipt.receiptJobs[0].last_error, 'Expo receipt is not available yet.');
    assert.equal(delayedReceipt.receiptJobs[0].available_after, '2026-10-11T00:45:00.000Z');
    const delayedSecondCheck = await delayedReceipt.expoPush.processExpoPushReceipts({ now: new Date('2026-10-11T00:45:00.000Z') });
    assert.equal(delayedSecondCheck.completed, 1);
    assert.equal(delayedReceipt.receiptJobs.length, 0);

    const staleTicket = loadExpoPush({
      ticketResponses: [[{ status: 'error', details: { error: 'DeviceNotRegistered' } }]],
    });
    const staleTicketResult = await staleTicket.expoPush.sendExpoPushNotifications([{
      id: 'notification-2', user_id: 'student-1', title: 'Old device', body: 'No longer valid',
    }]);
    assert.equal(staleTicketResult.rejected, 1);
    assert.equal(staleTicketResult.pruned, 1);
    assert.equal(staleTicket.deviceRows.length, 0, 'a ticket-level DeviceNotRegistered error removes the stale token');

    const staleReceipt = loadExpoPush({
      ticketResponses: [[{ status: 'ok', id: 'ticket-stale' }]],
      receiptResponses: [{
        'ticket-stale': { status: 'error', details: { error: 'DeviceNotRegistered' } },
      }],
    });
    await staleReceipt.expoPush.sendExpoPushNotifications([{
      id: 'notification-3', user_id: 'student-1', title: 'Receipt cleanup', body: 'Testing cleanup',
    }]);
    const staleReceiptResult = await staleReceipt.expoPush.processExpoPushReceipts({ now: new Date('2026-10-11T00:30:00.000Z') });
    assert.equal(staleReceiptResult.pruned, 1);
    assert.equal(staleReceipt.deviceRows.length, 0, 'a receipt-level DeviceNotRegistered error removes the stale token');
    assert.equal(staleReceipt.receiptJobs.length, 0);
  } finally {
    if (previousGate === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previousGate;
  }

  const { notify, scheduled } = loadNotify();
  const persisted = await notify.notify('student-1', {
    title: 'Application update', body: 'Reviewed', type: 'application', link: '/student/applications',
  });
  assert.equal(persisted.id, 'notification-1');
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0][0].id, 'notification-1');

  console.log('Notification device + Expo push contracts: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
