#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const utility = fs.readFileSync(path.join(root, 'src/utils/dsaDraftKey.js'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'src/screens/student/DsaProblemScreen.js'), 'utf8');
const scope = { module: { exports: {} }, encodeURIComponent };
vm.runInNewContext(`${utility.replace('export function dsaDraftKey', 'function dsaDraftKey')}\nmodule.exports = dsaDraftKey;`, scope);
const key = scope.module.exports;
assert.equal(key(null, 'problem-1', 'python'), null);
assert.equal(key('student-1', null, 'python'), null);
assert.notEqual(key('student-1', 'problem-1', 'python'), key('student-2', 'problem-1', 'python'));
assert.notEqual(key('student-1', 'problem-1', 'python'), key('student-1', 'problem-2', 'python'));
assert.notEqual(key('student-1', 'problem-1', 'python'), key('student-1', 'problem-1', 'javascript'));
assert.notEqual(key('student:2', 'p', 'python'), key('student', '2:p', 'python'));
assert.match(key('student-1', 'problem-1', 'python'), /^dsa_code_v2:/);
assert.match(screen, /AsyncStorage\.getItem\(key\)/);
assert.match(screen, /AsyncStorage\.setItem\(key,/);
assert.match(screen, /AsyncStorage\.removeItem\(key\)/);
assert.match(screen, /dsaDraftKey\(user\?\.id,/);
assert.equal(/AsyncStorage\.getItem\(\s*`dsa_code_/.test(screen), false);
console.log('DSA drafts are scoped by student account, problem, and language: PASS');
