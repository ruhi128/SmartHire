#!/usr/bin/env node
// Network-free Android notification checks; Expo native APIs are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const target = path.resolve(__dirname, '../src/notifications/pushNotifications.js');
const platform = { OS: 'android' };
const constants = {
  expoConfig: { extra: { eas: { projectId: 'local-test-project-id' } }, version: '1.0.0' },
  appOwnership: null,
  executionEnvironment: 'standalone',
};
const device = { isDevice: true, deviceName: 'Test Android' };
const sequence = [];
let installedHandler = null;
let permission = { status: 'undetermined' };
let requestedPermission = { status: 'granted' };
const notifications = {
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler(value) { installedHandler = value; },
  async setNotificationChannelAsync(name, options) { sequence.push(['channel', name, options.importance]); },
  async getPermissionsAsync() { sequence.push(['getPermission']); return permission; },
  async requestPermissionsAsync() { sequence.push(['requestPermission']); return requestedPermission; },
  async getExpoPushTokenAsync({ projectId }) { sequence.push(['getToken', projectId]); return { data: 'ExponentPushToken[test-android]' }; },
};

function loadModule() {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'react-native') return { Platform: platform };
      if (request === 'expo-constants') return { __esModule: true, default: constants };
      if (request === 'expo-device') return { __esModule: true, get isDevice() { return device.isDevice; }, get deviceName() { return device.deviceName; } };
      if (request === 'expo-notifications') return notifications;
      if (request === '../config/runtime') return { DEMO_MODE: false };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const source = fs.readFileSync(target, 'utf8');
    const output = babel.transformSync(source, {
      filename: target,
      babelrc: false,
      configFile: false,
      presets: [[require.resolve('babel-preset-expo'), { lazyImports: false }]],
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    const mod = new Module(target, module);
    mod.filename = target;
    mod.paths = Module._nodeModulePaths(path.dirname(target));
    mod._compile(output.code, target);
    return mod.exports;
  } finally {
    Module._load = originalLoad;
  }
}

async function main() {
  const { getPushCapability, parseNotificationResponse, requestExpoPushRegistration } = loadModule();
  assert.equal(installedHandler !== null, true, 'foreground banner handler is installed');
  const display = await installedHandler.handleNotification();
  assert.equal(display.shouldShowBanner, true);
  assert.equal(display.shouldShowList, true);
  assert.equal(getPushCapability().available, true);

  const result = await requestExpoPushRegistration();
  assert.equal(result.status, 'token_ready');
  assert.equal(result.platform, 'android');
  assert.equal(result.expoPushToken, 'ExponentPushToken[test-android]');
  assert.deepEqual(sequence.map((step) => step[0]), ['channel', 'getPermission', 'requestPermission', 'getToken']);
  assert.equal(sequence[0][1], 'smarthire-updates');
  assert.equal(sequence.at(-1)[1], 'local-test-project-id');

  sequence.length = 0;
  permission = { status: 'denied' };
  requestedPermission = { status: 'denied' };
  const denied = await requestExpoPushRegistration();
  assert.equal(denied.status, 'permission_denied');
  assert.equal(sequence.some(([method]) => method === 'getToken'), false);

  constants.executionEnvironment = 'storeClient';
  assert.equal(getPushCapability().available, false, 'Expo Go cannot receive Android remote pushes');
  constants.executionEnvironment = 'standalone';
  device.isDevice = false;
  assert.equal(getPushCapability().available, false, 'a physical phone is required');
  device.isDevice = true;

  const parsed = parseNotificationResponse({ notification: { request: {
    identifier: 'response-1', content: { data: { notificationId: 'note-1', recipientUserId: 'student-1', link: '/student/jobs' } },
  } } });
  assert.equal(parsed.recipientUserId, 'student-1');
  assert.equal(parsed.link, '/student/jobs');
  assert.equal(parseNotificationResponse({ notification: { request: { content: { data: { notificationId: 'note-1' } } } } }), null);
  console.log('Android push channel, permission, token, foreground and tap payload contracts: PASS');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
