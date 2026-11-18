#!/usr/bin/env node
// Network-free ATS PDF route tests: 8 MB limit, authentication/role, transient
// parsing, scanned-document handling, and no profile/Supabase file writes.
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const target = path.resolve(__dirname, '../routes/students.js');
let parsedText = '';
let parseCalls = 0;
let destroyed = 0;
const memoryStorages = [];
const router = {
  postHandlers: {},
  get() { return this; }, put() { return this; },
  post(route, ...handlers) { this.postHandlers[route] = handlers; return this; },
};
const multer = Object.assign(
  (options) => {
    memoryStorages.push(options);
    return {
      single(field) {
        return (req, res, next) => {
          assert.equal(field, 'document');
          if (req.uploadError) next(req.uploadError);
          else next();
        };
      },
    };
  },
  { memoryStorage: () => ({ kind: 'memory-only' }) },
);
const auth = (_req, _res, next) => next();
const roles = (...allowed) => {
  const guard = (_req, _res, next) => next();
  guard.allowed = allowed;
  return guard;
};
class PDFParse {
  constructor({ data }) { assert(Buffer.isBuffer(data)); parseCalls += 1; }
  async getText(options) {
    assert.equal(options?.pageJoiner, '', 'Generated page markers must not enter the ATS score.');
    return { text: parsedText };
  }
  async destroy() { destroyed += 1; }
}

const originalLoad = Module._load;
Module._load = function mockedLoad(request, parent, isMain) {
  if (parent?.filename === target) {
    if (request === 'express') return { Router: () => router };
    if (request === 'multer') return multer;
    if (request === 'pdf-parse') return { PDFParse };
    if (request === '../middleware/auth') return auth;
    if (request === '../middleware/roles') return roles;
    if (request === '../config/supabase') return { supabaseAdmin: { storage: { from() { throw new Error('ATS must not write profile storage'); } } } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
try {
  assert.equal(require(target), router);
} finally {
  Module._load = originalLoad;
  delete require.cache[target];
}

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
async function invoke({ file, uploadError }) {
  const res = response();
  const req = { user: { id: 'student-1', role: 'student' }, file, uploadError };
  const handlers = router.postHandlers['/ats/extract-pdf'];
  assert.equal(handlers.length, 4);
  assert.equal(handlers[0], auth);
  assert.deepEqual(handlers[1].allowed, ['student']);
  let accepted = false;
  handlers[2](req, res, () => { accepted = true; });
  if (accepted) await handlers[3](req, res);
  return res;
}

async function main() {
  assert(memoryStorages.some(({ limits, storage }) => limits?.fileSize === 8 * 1024 * 1024 && limits.files === 1 && storage.kind === 'memory-only'));
  parsedText = 'Software engineer with Python, SQL, projects, Git, Docker, and several internship experiences. Built services and documented measurable outcomes.';
  const ok = await invoke({ file: { buffer: Buffer.from('%PDF-1.7\n....'), originalname: 'resume.pdf', mimetype: 'application/pdf' } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.text, parsedText);
  assert(ok.body.word_count > 10);
  assert.equal(parseCalls, 1);
  assert.equal(destroyed, 1);
  const notPdf = await invoke({ file: { buffer: Buffer.from('PNG FILE'), originalname: 'resume.pdf', mimetype: 'application/pdf' } });
  assert.equal(notPdf.statusCode, 400);
  assert.equal(parseCalls, 1);
  const tooLarge = await invoke({ uploadError: { code: 'LIMIT_FILE_SIZE' } });
  assert.equal(tooLarge.statusCode, 413);
  assert.match(tooLarge.body.error, /8 MB/);
  parsedText = 'image';
  const scanned = await invoke({ file: { buffer: Buffer.from('%PDF-1.7\n'), originalname: 'jd.pdf', mimetype: 'application/pdf' } });
  assert.equal(scanned.statusCode, 422);
  assert.match(scanned.body.error, /image-scanned/);
  assert.equal(destroyed, 2);
  console.log('ATS PDF extraction is authenticated, bounded, transient, and rejects unreadable documents: PASS');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
