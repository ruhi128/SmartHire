#!/usr/bin/env node
// Local-only Express + real Multer + real pdf-parse integration check. This
// generates tiny selectable-text PDFs in memory; it does not use accounts,
// Supabase, the deployed API, or any external PDF service.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const express = require('express');

const routePath = path.resolve(__dirname, '../routes/students.js');
let storageCalls = 0;
const fakeAuth = (req, res, next) => {
  const role = req.get('x-local-test-role');
  if (!role) return res.status(401).json({ error: 'Not authenticated.' });
  req.user = { id: 'ats-local-test', role };
  next();
};
const fakeSupabase = {
  storage: {
    from() {
      storageCalls += 1;
      throw new Error('ATS extraction must never access profile file storage.');
    },
  },
};

const originalLoad = Module._load;
Module._load = function mockedLoad(request, parent, isMain) {
  if (parent?.filename === routePath) {
    if (request === '../middleware/auth') return fakeAuth;
    if (request === '../config/supabase') return { supabaseAdmin: fakeSupabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
let router;
try {
  router = require(routePath);
} finally {
  Module._load = originalLoad;
  delete require.cache[routePath];
}

function makePdf(text) {
  // A single Type1-font text stream is enough to exercise real parsing.
  const escaped = String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = text ? `BT /F1 10 Tf 72 720 Td (${escaped}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

function requestBody(bytes, filename, type = 'application/pdf') {
  const form = new FormData();
  form.append('document', new Blob([bytes], { type }), filename);
  return form;
}

async function post(origin, body, role = 'student') {
  const response = await fetch(`${origin}/api/students/ats/extract-pdf`, {
    method: 'POST', body,
    headers: role ? { 'x-local-test-role': role } : {},
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  const app = express();
  app.use('/api/students', router);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const resumeText = 'Software engineer with Python SQL Git and Docker experience built APIs, led a project, and documented measurable results.';
    const jdText = 'Seeking software engineer skilled in Python SQL Git, cloud deployment and API testing with strong problem solving skills.';
    const resume = makePdf(resumeText);
    const jd = makePdf(jdText);
    assert.equal((await post(origin, requestBody(resume, 'resume.pdf'), '')).status, 401);
    assert.equal((await post(origin, requestBody(resume, 'resume.pdf'), 'recruiter')).status, 403);
    const parsedResume = await post(origin, requestBody(resume, 'resume.pdf'));
    assert.equal(parsedResume.status, 200);
    assert.equal(parsedResume.body.text, resumeText);
    assert.equal(parsedResume.body.text.includes('-- 1 of 1 --'), false);
    assert.ok(parsedResume.body.word_count > 10);
    const parsedJd = await post(origin, requestBody(jd, 'job-description.pdf'));
    assert.equal(parsedJd.status, 200);
    assert.equal(parsedJd.body.text, jdText);
    assert.notEqual(parsedJd.body.text, parsedResume.body.text);
    assert.equal((await post(origin, requestBody(Buffer.from('not a PDF'), 'image.pdf'))).status, 400);
    assert.equal((await post(origin, requestBody(makePdf(''), 'scan.pdf'))).status, 422);
    const oversized = Buffer.concat([resume, Buffer.alloc(8 * 1024 * 1024)]);
    const tooLarge = await post(origin, requestBody(oversized, 'oversized.pdf'));
    assert.equal(tooLarge.status, 413);
    assert.match(tooLarge.body.error, /8 MB/);
    assert.equal(storageCalls, 0);
    console.log('Real PDF parser + multipart ATS extraction, both documents, role gating, size limits, and no storage writes: PASS');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
