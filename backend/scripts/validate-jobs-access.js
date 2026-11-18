#!/usr/bin/env node
// Recruiter ownership and pending-job privacy, including direct URLs and
// unauthorised application attempts. No Supabase or SMTP connection required.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const jobsTarget = path.resolve(__dirname, '../routes/jobs.js');
const applicationsTarget = path.resolve(__dirname, '../routes/applications.js');
const jobs = [
  { id: 'job-own', company_id: 'company-own', status: 'active', approval_status: 'approved', title: 'My job' },
  { id: 'job-other', company_id: 'company-other', status: 'active', approval_status: 'pending', title: 'Private job' },
];
const companies = [
  { id: 'company-own', recruiter_id: 'recruiter-1' },
  { id: 'company-other', recruiter_id: 'recruiter-2' },
];
const writes = [];
const db = {
  from(table) {
    const query = { table, where: [], mutation: null };
    const rows = { job_postings: jobs, companies }[table] || [];
    const read = () => {
      const matches = rows.filter((row) => query.where.every(([key, value]) => row[key] === value));
      if (query.mutation) {
        for (const row of matches) Object.assign(row, query.mutation);
        if (matches.length) writes.push({ table, where: query.where, mutation: query.mutation });
      }
      return { data: matches, error: null };
    };
    const chain = {
      select() { return this; },
      eq(key, value) { query.where.push([key, value]); return this; },
      update(payload) { query.mutation = payload; return this; },
      order() { return this; },
      maybeSingle() { const { data } = read(); return Promise.resolve({ data: data[0] || null, error: null }); },
      single() { const { data } = read(); return Promise.resolve({ data: data[0] || null, error: data.length ? null : { code: 'PGRST116' } }); },
      then(resolve, reject) { return Promise.resolve(read()).then(resolve, reject); },
    };
    return chain;
  },
};
function response() {
  return { statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
function load(target) {
  const router = { gets: {}, posts: {}, puts: {}, patches: {}, deletes: {},
    get(route, ...handlers) { this.gets[route] = handlers.at(-1); return this; },
    post(route, ...handlers) { this.posts[route] = handlers.at(-1); return this; },
    put(route, ...handlers) { this.puts[route] = handlers.at(-1); return this; },
    patch(route, ...handlers) { this.patches[route] = handlers.at(-1); return this; },
    delete(route, ...handlers) { this.deletes[route] = handlers.at(-1); return this; },
  };
  const noop = (_req, _res, next) => next?.();
  const validator = { notEmpty() { return this; }, isNumeric() { return this; } };
  const original = Module._load;
  Module._load = function mock(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === 'express-validator') return { body: () => validator, validationResult: () => ({ isEmpty: () => true }) };
      if (request === '../config/supabase') return db;
      if (request === '../middleware/auth') return noop;
      if (request === '../middleware/roles') return () => noop;
      if (request === '../config/email') return {};
      if (request === '../utils/notify') return { notify: () => {}, notifyMany: () => {} };
    }
    return original.call(this, request, parent, isMain);
  };
  try { delete require.cache[target]; require(target); return router; }
  finally { Module._load = original; delete require.cache[target]; }
}
async function run() {
  const routes = load(jobsTarget);
  const own = { id: 'recruiter-1', role: 'recruiter' };
  let res = response();
  await routes.gets['/']({ user: { id: 'recruiter-without-company', role: 'recruiter' }, query: {} }, res);
  assert.deepEqual(res.body, [], 'unlinked recruiter cannot enumerate all jobs');
  res = response();
  await routes.gets['/']({ user: own, query: {} }, res);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, 'job-own');
  for (const user of [{ id: 'student-1', role: 'student' }, own]) {
    res = response();
    await routes.gets['/:id']({ user, params: { id: 'job-other' } }, res);
    assert.equal(res.statusCode, 404, `${user.role} cannot read pending/other-company job by URL`);
  }
  res = response();
  await routes.gets['/:id']({ user: { id: 'admin-1', role: 'admin' }, params: { id: 'job-other' } }, res);
  assert.equal(res.statusCode, 200, 'admin can review a pending job');

  const count = writes.length;
  res = response();
  await routes.posts['/']({ user: own, body: { title: 'Impersonated', company_id: 'company-other', package_lpa: 8, deadline: '2026-11-15' } }, res);
  assert.equal(res.statusCode, 403, 'recruiter cannot create a job for another company');
  res = response();
  await routes.puts['/:id']({ user: own, params: { id: 'job-other' }, body: { title: 'Hacked' } }, res);
  assert.equal(res.statusCode, 404);
  res = response();
  await routes.deletes['/:id']({ user: own, params: { id: 'job-other' } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(writes.length, count, 'unauthorised writes never mutate a job');
  assert.equal(jobs[1].title, 'Private job');
  res = response();
  await routes.puts['/:id']({ user: own, params: { id: 'job-own' }, body: { title: 'Updated own job' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(jobs[0].title, 'Updated own job');
  res = response();
  await routes.patches['/:id/approve']({ user: { id: 'admin-1', role: 'admin' }, params: { id: 'job-own' }, body: { action: 'approve' } }, res);
  assert.equal(res.statusCode, 409, 'approved job cannot be approved again');

  const applicationRoutes = load(applicationsTarget);
  res = response();
  await applicationRoutes.posts['/']({ user: { id: 'student-1', role: 'student' }, body: { job_id: 'job-other' } }, res);
  assert.equal(res.statusCode, 404, 'student cannot apply to a pending job even with its UUID');
  console.log('Job ownership, pending-job privacy and application authorization: PASS');
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
