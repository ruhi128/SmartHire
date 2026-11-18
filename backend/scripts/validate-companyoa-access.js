#!/usr/bin/env node
// Direct Company OA URLs must not bypass student eligibility/activation;
// recruiters may only preview answer keys for their own company's tests.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const target = path.resolve(__dirname, '../routes/companyoa.js');
const queries = [];
const rows = {
  company_oa_tests: [{ id: 'test-1', company_id: 'company-other', submitted_by: 'other-recruiter',
    approval_status: 'approved', is_active: true, title: 'Test', target_branches: ['CST'], min_cgpa: 8 }],
  student_profiles: [{ id: 'student-1', branch: 'IT', cgpa: 7 }],
  company_oa_attempts: [],
  company_oa_questions: [{ id: 'q-1', test_id: 'test-1', correct_index: 2, question_text: 'Question?' }],
  companies: [{ id: 'company-other', recruiter_id: 'other-recruiter' }],
};
const db = {
  from(table) {
    const query = { table, conditions: [], select: null, mutation: null };
    queries.push(query);
    const chain = {
      select(fields) { query.select = fields; return this; },
      eq(key, value) { query.conditions.push([key, value]); return this; },
      update(data) { query.mutation = data; return this; },
      order() { return Promise.resolve(read()); },
      single() { const { data } = read(); return Promise.resolve({ data: data[0] || null, error: data.length ? null : { code: 'PGRST116' } }); },
      maybeSingle() { const { data } = read(); return Promise.resolve({ data: data[0] || null, error: null }); },
    };
    function read() {
      return { data: (rows[table] || []).filter((record) => query.conditions.every(([key, val]) => record[key] === val)), error: null };
    }
    return chain;
  },
};

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function load() {
  const router = { gets: {}, posts: {}, patches: {}, deletes: {},
    get(route, ...handlers) { this.gets[route] = handlers.at(-1); return this; },
    post(route, ...handlers) { this.posts[route] = handlers.at(-1); return this; },
    patch(route, ...handlers) { this.patches[route] = handlers.at(-1); return this; },
    delete(route, ...handlers) { this.deletes[route] = handlers.at(-1); return this; },
  };
  const noop = (_req, _res, next) => next?.();
  const original = Module._load;
  Module._load = function mock(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../config/supabase') return db;
      if (request === '../middleware/auth') return noop;
      if (request === '../middleware/roles') return () => noop;
    }
    return original.call(this, request, parent, isMain);
  };
  try { delete require.cache[target]; require(target); return router; }
  finally { Module._load = original; delete require.cache[target]; }
}
async function run() {
  const router = load();
  const student = { id: 'student-1', role: 'student' };
  const studentReq = { user: student, params: { id: 'test-1' }, body: { answers: {} } };
  let res = response();
  await router.gets['/:id/take'](studentReq, res);
  assert.equal(res.statusCode, 403);
  assert.equal(queries.filter((q) => q.table === 'company_oa_questions').length, 0, 'no questions sent to ineligible student');
  assert(queries.some((q) => q.table === 'company_oa_tests' && q.conditions.some(([key, val]) => key === 'is_active' && val === true)));

  res = response();
  await router.posts['/:id/attempt'](studentReq, res);
  assert.equal(res.statusCode, 403);
  assert.equal(queries.filter((q) => q.table === 'company_oa_questions').length, 0, 'no grading for ineligible student');
  assert.equal(queries.filter((q) => q.table === 'company_oa_attempts' && q.mutation).length, 0);

  res = response();
  await router.gets['/:id/questions']({ user: { id: 'different-recruiter', role: 'recruiter' }, params: { id: 'test-1' } }, res);
  assert.equal(res.statusCode, 403);

  res = response();
  await router.gets['/:id/questions']({ user: { id: 'admin-1', role: 'admin' }, params: { id: 'test-1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.questions[0].correct_index, 2);

  res = response();
  await router.patches['/:id/approve']({ user: { id: 'admin-1', role: 'admin' }, params: { id: 'test-1' }, body: { action: 'approve' } }, res);
  assert.equal(res.statusCode, 409, 'approved tests cannot be approved again');
  assert(queries.some((q) => q.table === 'company_oa_tests' && q.mutation && q.conditions.some(([key, val]) => key === 'approval_status' && val === 'pending')));
  console.log('Company OA eligibility, recruiter preview, pending-only review: PASS');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
