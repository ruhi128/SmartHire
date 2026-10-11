#!/usr/bin/env node

/**
 * Network-free regression check for the student profile/dashboard routes.
 *
 * Existing Supabase projects can receive a backend deployment before the
 * incremental avatar migration. The real route must still return the profile
 * and dashboard (with avatar fields set to null), rather than changing those
 * unrelated reads into generic 500 responses.
 */
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const studentProfile = {
  id: 'student-1',
  full_name: 'Aarav Mehta',
  branch: 'Computer Science',
  cgpa: 8.4,
};

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createSupabase({
  avatarSchemaMissing = false,
  avatarSchemaError = {
    code: 'PGRST204',
    message: "Could not find the 'avatar_path' column of 'users' in the schema cache",
  },
} = {}) {
  function settled(data, error = null) {
    const value = { data, error };
    return {
      then(onFulfilled, onRejected) {
        return Promise.resolve(value).then(onFulfilled, onRejected);
      },
    };
  }

  function tableResult(table) {
    if (table === 'student_profiles') return { data: { ...studentProfile }, error: null };
    if (table === 'users') {
      if (avatarSchemaMissing) {
        return {
          data: null,
          error: avatarSchemaError,
        };
      }
      return {
        data: { avatar_path: 'student-1/avatar.jpg', avatar_updated_at: '2026-10-11T12:00:00.000Z' },
        error: null,
      };
    }
    if (table === 'applications') {
      return {
        data: [{ id: 'application-1', status: 'shortlisted', applied_at: '2026-10-10T10:00:00.000Z' }],
        error: null,
      };
    }
    return { data: [], error: null };
  }

  return {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        limit() { return query; },
        insert() { return query; },
        single() {
          const { data, error } = tableResult(table);
          return settled(data, error);
        },
        maybeSingle() {
          const { data, error } = tableResult(table);
          return settled(data, error);
        },
        then(onFulfilled, onRejected) {
          const { data, error } = tableResult(table);
          return Promise.resolve({ data, error }).then(onFulfilled, onRejected);
        },
      };
      return query;
    },
  };
}

function loadRoute(supabase) {
  const router = {
    getHandlers: {},
    postHandlers: {},
    putHandlers: {},
    get(routePath, ...handlers) {
      this.getHandlers[routePath] = handlers.at(-1);
      return this;
    },
    post(routePath, ...handlers) {
      this.postHandlers[routePath] = handlers.at(-1);
      return this;
    },
    put(routePath, ...handlers) {
      this.putHandlers[routePath] = handlers.at(-1);
      return this;
    },
  };
  const target = path.resolve(__dirname, '../routes/students.js');
  const originalLoad = Module._load;
  const multer = Object.assign(
    () => ({ single: () => (_req, _res, next) => next?.() }),
    { memoryStorage: () => ({}) },
  );

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'express') return { Router: () => router };
    if (request === 'multer') return multer;
    if (request === 'pdf-parse') return { PDFParse: class PDFParse {} };
    if (request === '../config/supabase' && parent?.filename === target) return { supabaseAdmin: supabase };
    if (request === '../middleware/auth' && parent?.filename === target) return (_req, _res, next) => next?.();
    if (request === '../middleware/roles' && parent?.filename === target) return () => (_req, _res, next) => next?.();
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[target];
    assert.equal(require(target), router);
    return router;
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

async function invoke(router, routePath) {
  const response = createResponse();
  await router.getHandlers[routePath]({ user: { id: 'student-1', role: 'student' } }, response);
  return response;
}

async function run() {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...parts) => warnings.push(parts.join(' '));
  try {
    const fallbackRouter = loadRoute(createSupabase({ avatarSchemaMissing: true }));
    const profileResponse = await invoke(fallbackRouter, '/profile');
    assert.equal(profileResponse.statusCode, 200);
    assert.equal(profileResponse.body.profile.full_name, 'Aarav Mehta');
    assert.equal(profileResponse.body.profile.avatar_url, null);
    assert.equal(profileResponse.body.profile.avatar_updated_at, null);

    const dashboardResponse = await invoke(fallbackRouter, '/dashboard');
    assert.equal(dashboardResponse.statusCode, 200);
    assert.equal(dashboardResponse.body.profile.full_name, 'Aarav Mehta');
    assert.equal(dashboardResponse.body.profile.avatar_url, null);
    assert.equal(dashboardResponse.body.applications.shortlisted, 1);
    assert.ok(warnings.some((message) => message.includes('006_profile_avatars.sql')));

    // PostgreSQL may report the same absent column directly instead of the
    // PostgREST schema-cache PGRST204 error seen in hosted Supabase projects.
    const postgresFallbackRouter = loadRoute(createSupabase({
      avatarSchemaMissing: true,
      avatarSchemaError: { code: '42703', message: 'column users.avatar_path does not exist' },
    }));
    const postgresProfileResponse = await invoke(postgresFallbackRouter, '/profile');
    assert.equal(postgresProfileResponse.statusCode, 200);
    assert.equal(postgresProfileResponse.body.profile.avatar_url, null);

    const linkedRouter = loadRoute(createSupabase());
    const linkedProfileResponse = await invoke(linkedRouter, '/profile');
    assert.equal(linkedProfileResponse.statusCode, 200);
    assert.equal(
      linkedProfileResponse.body.profile.avatar_url,
      '/api/auth/avatar?v=2026-10-11T12%3A00%3A00.000Z',
    );

    console.log('Student profile/dashboard avatar-migration fallback: PASS');
  } finally {
    console.warn = originalWarn;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
