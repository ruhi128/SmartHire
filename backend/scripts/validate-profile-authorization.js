#!/usr/bin/env node
// Student profile edits may never change placement-team-managed identity/status.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const target = path.resolve(__dirname, '../routes/students.js');
const profiles = new Map([['student-1', { id: 'student-1', full_name: 'Before', roll_number: '21IT104', placement_status: 'placed' }]]);
const writes = [];
const db = {
  from(table) {
    const query = { table, where: {}, write: null, payload: null };
    const chain = {
      select() { return this; },
      eq(key, value) { query.where[key] = value; return this; },
      update(data) { query.write = 'update'; query.payload = data; return this; },
      insert(data) { query.write = 'insert'; query.payload = data; return this; },
      maybeSingle() { return Promise.resolve(read()); },
      single() { return Promise.resolve(read()); },
    };
    function read() {
      if (table === 'users') return { data: { avatar_path: null, avatar_updated_at: null }, error: null };
      if (table === 'student_profiles') {
        if (query.write) {
          writes.push({ type: query.write, payload: query.payload, where: query.where });
          const id = query.write === 'insert' ? query.payload.id : query.where.id;
          const updated = { ...(profiles.get(id) || {}), ...query.payload };
          profiles.set(id, updated);
          return { data: updated, error: null };
        }
        return { data: profiles.get(query.where.id) || null, error: null };
      }
      return { data: null, error: null };
    }
    return chain;
  },
};

function load() {
  const router = { handlers: {}, get(_p) { return this; }, post(_p) { return this; }, put(p, ...handlers) { this.handlers[p] = handlers; return this; } };
  const auth = (_req, _res, next) => next?.();
  const multer = Object.assign(() => ({ single: () => auth }), { memoryStorage: () => ({}) });
  const original = Module._load;
  Module._load = function mock(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../config/supabase') return { supabaseAdmin: db };
      if (request === '../middleware/auth') return auth;
      if (request === '../middleware/roles') return () => auth;
      if (request === 'multer') return multer;
      if (request === 'pdf-parse') return { PDFParse: class {} };
    }
    return original.call(this, request, parent, isMain);
  };
  try { delete require.cache[target]; require(target); return router.handlers['/profile'].at(-1); }
  finally { Module._load = original; delete require.cache[target]; }
}

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function run() {
  const update = load();
  const body = { full_name: 'Updated', placement_status: 'unplaced', roll_number: 'FORGED', skills: ['JavaScript'],
    cgpa: 0, tenth_percent: 0, twelfth_percent: 0, linkedin_url: 'https://linkedin.com/in/example' };
  let res = response();
  await update({ user: { id: 'student-1', role: 'student', email: 'student@example.com' }, body }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.profile.placement_status, 'placed');
  assert.equal(res.body.profile.roll_number, '21IT104');
  assert.equal(res.body.profile.email, 'student@example.com');
  assert.equal(res.body.profile.cgpa, 0, 'zero CGPA is persisted, not coerced to null');
  assert.equal(res.body.profile.tenth_percent, 0);
  assert.equal(res.body.profile.twelfth_percent, 0);
  assert.equal(res.body.profile.linkedin_url, 'https://linkedin.com/in/example');
  assert.equal(writes[0].type, 'update');
  assert(!Object.hasOwn(writes[0].payload, 'placement_status'));
  assert(!Object.hasOwn(writes[0].payload, 'roll_number'));
  assert.equal(writes[0].where.id, 'student-1');

  res = response();
  await update({ user: { id: 'student-3', role: 'student', email: 'new@example.com' }, body }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.profile.placement_status, 'unplaced');
  assert.equal(res.body.profile.roll_number, undefined);
  assert.equal(writes[1].type, 'insert');
  assert.equal(writes[1].payload.id, 'student-3');
  assert(!Object.hasOwn(writes[1].payload, 'roll_number'));

  const count = writes.length;
  res = response();
  await update({ user: { id: 'student-1', role: 'student' }, body: { ...body, cgpa: 11 } }, res);
  assert.equal(res.statusCode, 400, 'out-of-range academic values are rejected');
  res = response();
  await update({ user: { id: 'student-1', role: 'student' }, body: { ...body, github_url: 'javascript:alert(1)' } }, res);
  assert.equal(res.statusCode, 400, 'unsafe profile links are rejected');
  assert.equal(writes.length, count, 'invalid submissions never write');
  console.log('Student profile authorization, numeric fields, and links: PASS');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
