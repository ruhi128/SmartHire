#!/usr/bin/env node

/**
 * Network-free regression check for auth account reads during the avatar
 * migration rollout. Existing databases without migration 006 must still be
 * able to log in and load /api/auth/me; actual avatar operations must state
 * the required migration instead of failing ambiguously.
 */
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const account = {
  id: 'student-1',
  email: 'aarav@example.com',
  role: 'student',
  is_active: true,
  email_verified: true,
  created_at: '2026-10-01T00:00:00.000Z',
};
const profile = {
  full_name: 'Aarav Mehta',
  roll_number: 'CSE-101',
  branch: 'Computer Science',
  cgpa: 8.4,
  placement_status: 'unplaced',
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

function createSupabase() {
  const result = (data, error = null) => Promise.resolve({ data, error });
  const avatarColumnError = {
    code: 'PGRST204',
    message: "Could not find the 'avatar_path' column of 'users' in the schema cache",
  };

  return {
    from(table) {
      const query = {
        selectedFields: '',
        select(fields) {
          this.selectedFields = String(fields || '');
          return this;
        },
        eq() { return this; },
        order() { return this; },
        limit() { return this; },
        update() { return this; },
        insert() { return this; },
        maybeSingle() {
          if (table === 'users' && /avatar_(?:path|updated_at)/.test(this.selectedFields)) {
            return result(null, avatarColumnError);
          }
          if (table === 'users') return result({ ...account });
          if (table === 'student_profiles') return result({ ...profile });
          return result(null);
        },
        single() {
          if (table === 'users' && /avatar_(?:path|updated_at)/.test(this.selectedFields)) {
            return result(null, avatarColumnError);
          }
          if (table === 'users') return result({ ...account });
          if (table === 'student_profiles') return result({ ...profile });
          return result(null);
        },
      };
      return query;
    },
  };
}

function loadRoute() {
  const router = {
    getHandlers: {},
    postHandlers: {},
    deleteHandlers: {},
    get(routePath, ...handlers) {
      this.getHandlers[routePath] = handlers.at(-1);
      return this;
    },
    post(routePath, ...handlers) {
      this.postHandlers[routePath] = handlers.at(-1);
      return this;
    },
    delete(routePath, ...handlers) {
      this.deleteHandlers[routePath] = handlers.at(-1);
      return this;
    },
  };
  const target = path.resolve(__dirname, '../routes/auth.js');
  const originalLoad = Module._load;
  const supabase = createSupabase();
  const validationChain = {
    isEmail: () => validationChain,
    withMessage: () => validationChain,
    isLength: () => validationChain,
    isIn: () => validationChain,
    if: () => validationChain,
    equals: () => validationChain,
    notEmpty: () => validationChain,
    trim: () => validationChain,
    toLowerCase: () => validationChain,
  };
  const multer = Object.assign(
    () => ({ single: () => (_req, _res, next) => next?.() }),
    { memoryStorage: () => ({}) },
  );

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'express') return { Router: () => router };
    if (request === 'multer') return multer;
    if (request === 'jsonwebtoken') return { sign: () => 'test-jwt' };
    if (request === 'bcryptjs') return { hash: async () => 'hash', compare: async () => true };
    if (request === 'express-validator') {
      return {
        body: () => validationChain,
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      };
    }
    if (request === '../config/supabase' && parent?.filename === target) {
      return {
        ...supabase,
        supabaseAdmin: supabase,
        supabaseAuth: {
          auth: {
            signInWithPassword: async () => ({
              data: { user: { id: account.id, email: account.email } },
              error: null,
            }),
          },
        },
      };
    }
    if (request === '../config/email' && parent?.filename === target) return { sendOtpEmail: async () => {} };
    if (request === '../middleware/auth' && parent?.filename === target) return (_req, _res, next) => next?.();
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

async function run() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const warnings = [];
  console.log = () => {};
  console.warn = (...parts) => warnings.push(parts.join(' '));
  try {
    const router = loadRoute();

    const login = createResponse();
    await router.postHandlers['/login'](
      { body: { email: account.email, password: 'strong-password' } },
      login,
    );
    assert.equal(login.statusCode, 200);
    assert.equal(login.body.token, 'test-jwt');
    assert.equal(login.body.role, 'student');
    assert.equal(login.body.avatar_url, null);
    assert.equal(login.body.profile.full_name, 'Aarav Mehta');
    assert.equal(login.body.profile.avatar_url, null);

    const me = createResponse();
    await router.getHandlers['/me']({ user: { id: account.id } }, me);
    assert.equal(me.statusCode, 200);
    assert.equal(me.body.email, account.email);
    assert.equal(me.body.avatar_url, null);
    assert.equal(me.body.avatar_updated_at, null);
    assert.equal(Object.hasOwn(me.body, 'avatar_path'), false);

    const avatarUpload = createResponse();
    await router.postHandlers['/avatar'](
      {
        user: { id: account.id },
        file: {
          // Valid PNG signature; schema check occurs before storage access.
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]),
          mimetype: 'image/png',
        },
      },
      avatarUpload,
    );
    assert.equal(avatarUpload.statusCode, 503);
    assert.match(avatarUpload.body.error, /006_profile_avatars\.sql/);
    assert.ok(warnings.some((message) => message.includes('006_profile_avatars.sql')));

    console.log = originalLog;
    console.log('Auth avatar-migration fallback: PASS');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
