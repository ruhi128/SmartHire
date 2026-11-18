#!/usr/bin/env node
// Pure, network-free Mock OA client checks: no local score on failed save,
// no pre-submit answer model, and recruiter-authored Markdown cannot run HTML.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/student/MockOA.jsx'), 'utf8');
assert(!source.includes('calcScore('), 'submission errors must not create an unsaved result');
assert.match(source, /Submission failed; no attempt was saved/);
assert(source.includes('if (!d?.attemptId || typeof d.score'), 'result must be confirmed by the server');
assert(source.includes('setAttemptLocked(true)'), 'expired attempts must freeze before retry');
assert(!source.includes("localStorage.getItem('oa_attempts_"), 'saved attempt history is server owned');
const detectorStart = source.indexOf('const STARTER_BOILERPLATES = {');
const detectorEnd = source.indexOf('// ── Format Question Description', detectorStart);
assert(detectorStart >= 0 && detectorEnd > detectorStart);
const detectBoilerplate = vm.runInNewContext(`${source.slice(detectorStart, detectorEnd)}\nisBoilerplateOrEmpty;`, {});
assert.equal(detectBoilerplate('print(input())', 'python3', ''), false, 'short echo solution reaches server grading');
assert.equal(detectBoilerplate('# comment only', 'python3', ''), true);
assert.equal(detectBoilerplate('print("Program executed successfully")', 'python3', ''), true);
const begin = source.indexOf('function formatMarkdown(md) {');
const end = source.indexOf('// ── Pill filter button', begin);
assert(begin >= 0 && end > begin);
const formatMarkdown = vm.runInNewContext(`${source.slice(begin, end)}\nformatMarkdown;`, {});
const rendered = formatMarkdown('<script>alert(1)</script> <img src=x onerror="alert(1)"> [open](javascript:alert(1)) ![bad](data:text/html,hi)');
assert(!rendered.includes('<script'));
assert(!/<img[^>]*onerror=/i.test(rendered), 'raw image attributes must not become executable HTML');
assert(!rendered.includes('href="javascript:'));
assert(!rendered.includes('src="data:'));
assert(rendered.includes('&lt;script&gt;'));
assert(formatMarkdown('[safe](https://example.org/docs)').includes('href="https://example.org/docs"'));
assert(formatMarkdown('**hello**').includes('<strong'));
console.log('Mock OA website retry/privacy/Markdown contracts: PASS');
