#!/usr/bin/env node
// Dashboard numbers are actual DB values, never sample-placement placeholders.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const target = path.resolve(__dirname, '../routes/admin.js');
let fail = false;
const db = {
  from(table) {
    const query = { table, fields: '', count: false, filters: [] };
    const chain = {
      select(fields, options = {}) { query.fields = fields; query.count = Boolean(options.count); return this; },
      eq(key, value) { query.filters.push([key, value]); return this; },
      order() { return this; }, limit() { return this; },
      then(resolve, reject) {
        const placed = query.filters.some(([key, value]) => key === 'placement_status' && value === 'placed');
        const res = fail && table === 'applications' && query.fields.includes('job_postings(companies')
          ? { data: null, error: new Error('Database unavailable') }
          : query.count ? { count: table === 'users' ? 3 : placed ? 0 : 0, error: null }
            : { data: [], error: null };
        return Promise.resolve(res).then(resolve, reject);
      },
    };
    return chain;
  },
};
function load() {
  const router = { gets: {}, posts: {}, patches: {}, deletes: {},
    get(route, ...handlers) { this.gets[route] = handlers.at(-1); return this; },
    post() { return this; }, patch() { return this; }, delete() { return this; },
  };
  const noop = (_req, _res, next) => next?.();
  const original = Module._load;
  Module._load = function mock(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../config/supabase') return db;
      if (request === '../middleware/auth') return noop;
      if (request === '../middleware/roles') return () => noop;
      if (request === '../config/email') return { sendAnnouncementEmail: async () => {} };
    }
    return original.call(this, request, parent, isMain);
  };
  try { delete require.cache[target]; require(target); return router.gets['/stats']; }
  finally { Module._load = original; delete require.cache[target]; }
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
async function run() {
  const stats = load();
  let res = response();
  await stats({ user: { id: 'admin-1', role: 'admin' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.overview, { totalStudents: 3, placedStudents: 0, placementRate: 0, activeJobs: 0, totalApplications: 0 });
  assert.deepEqual(res.body.topCompanies, []);
  assert.deepEqual(res.body.branchWise, []);
  assert.deepEqual(res.body.recentApplications, []);

  fail = true;
  const original = console.error;
  console.error = () => {};
  try {
    res = response();
    await stats({ user: { id: 'admin-1', role: 'admin' } }, res);
    assert.equal(res.statusCode, 500, 'failed queries cannot be reported as zero');
  } finally { console.error = original; }
  console.log('Admin statistics real-zero/error contracts: PASS');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
