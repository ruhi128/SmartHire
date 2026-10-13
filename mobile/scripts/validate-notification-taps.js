#!/usr/bin/env node

/**
 * Network-free regression check for the pure bounded push-tap deduper. It does
 * not load Expo native modules or make any API requests.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const helperPath = path.resolve(__dirname, '../src/notifications/tapDeduplication.js');
const source = fs.readFileSync(helperPath, 'utf8');
const output = babel.transformSync(source, {
  filename: helperPath,
  babelrc: false,
  configFile: false,
  presets: [[require.resolve('babel-preset-expo'), { lazyImports: false }]],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const helperModule = new Module(helperPath, module);
helperModule.filename = helperPath;
helperModule.paths = Module._nodeModulePaths(path.dirname(helperPath));
helperModule._compile(output.code, helperPath);

const { createPushTapDeduper } = helperModule.exports;

function run() {
  let now = 0;
  const ttlDeduper = createPushTapDeduper({ maxEntries: 4, ttlMs: 50, now: () => now });
  assert.equal(ttlDeduper.remember('tap-a'), true);
  assert.equal(ttlDeduper.remember('tap-a'), false, 'listener and launch lookup share one tap action');
  assert.equal(ttlDeduper.size(), 1);
  now = 49;
  assert.equal(ttlDeduper.remember('tap-a'), false, 'a duplicate refreshes the short TTL window');
  now = 100;
  assert.equal(ttlDeduper.remember('tap-a'), true, 'an expired key becomes actionable again');
  assert.equal(ttlDeduper.remember('   '), false, 'empty response keys are never queued');

  now = 0;
  const boundedDeduper = createPushTapDeduper({ maxEntries: 2, ttlMs: 1000, now: () => now });
  assert.equal(boundedDeduper.remember('first'), true);
  now += 1;
  assert.equal(boundedDeduper.remember('second'), true);
  now += 1;
  assert.equal(boundedDeduper.remember('third'), true);
  assert.equal(boundedDeduper.size(), 2, 'retention never exceeds the LRU bound');
  assert.equal(boundedDeduper.remember('first'), true, 'the oldest bounded key is evicted rather than retained forever');
  boundedDeduper.forget('first');
  assert.equal(boundedDeduper.remember('first'), true, 'a wrong-account response can be released for its rightful user');

  console.log('Bounded push-tap deduplication contracts: PASS');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
