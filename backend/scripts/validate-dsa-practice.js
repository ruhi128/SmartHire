#!/usr/bin/env node

/**
 * Network-free regression checks for the DSA function runner.
 *
 * It executes generated Python and JavaScript programs locally, then invokes
 * the real Express route handlers with a small Supabase/runner double. This
 * validates the typed wrappers, private-test response contract, result-marker
 * redaction, and performance semantics without JDoodle or Supabase access.
 */
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const routePath = path.resolve(__dirname, '../routes/dsa.js');
const routeSource = fs.readFileSync(routePath, 'utf8');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localExecute(program, language) {
  const command = language === 'python' ? 'python3' : 'node';
  const args = language === 'python' ? ['-c', program] : ['-e', program];
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 8_000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    verdict: result.status === 0 ? 'Accepted' : 'Runtime Error',
    time: '0.001',
    memory: '1',
    engine: 'local-dsa-validator',
  };
}

function loadHarness() {
  const start = routeSource.indexOf('const FUNCTION_RESULT_MARKER_PREFIX');
  const end = routeSource.indexOf('// ─────────────────────────────────────────────\n// GET /api/dsa/problems', start);
  assert.ok(start >= 0 && end > start, 'Could not isolate the DSA harness helpers.');

  const sandbox = {
    crypto,
    module: { exports: {} },
    exports: {},
    console,
    Set,
    Map,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
  };
  vm.createContext(sandbox);
  vm.runInContext(`${routeSource.slice(start, end)}
module.exports = {
  createFunctionRunnerContext,
  resolveTypedSpec,
  buildFunctionProgram,
  parseFunctionOutput,
  stripFunctionResultMarker,
  typedValuesMatch,
  buildDsaPerformance,
  functionExecutionForClient,
};`, sandbox, { filename: 'dsa-harness.js' });
  return sandbox.module.exports;
}

function runTyped(harness, { source, language, spec, args }) {
  const context = harness.createFunctionRunnerContext();
  const program = harness.buildFunctionProgram(source, language, spec, args, context);
  const execution = localExecute(program, language);
  assert.equal(execution.verdict, 'Accepted', `${language} wrapper failed:\n${execution.stderr}\n${program}`);
  return {
    ...execution,
    actual: harness.parseFunctionOutput(execution.stdout, context.marker),
    marker: context.marker,
  };
}

function assertTypedCase(harness, details) {
  const result = runTyped(harness, details);
  assert.equal(
    harness.typedValuesMatch(result.actual, details.expected, details.spec.compare),
    true,
    `${details.label} returned ${JSON.stringify(result.actual)} rather than ${JSON.stringify(details.expected)}`,
  );
}

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function createRouteHarness(problem) {
  const router = {
    getHandlers: {},
    postHandlers: {},
    get(route, ...handlers) { this.getHandlers[route] = handlers.at(-1); return this; },
    post(route, ...handlers) { this.postHandlers[route] = handlers.at(-1); return this; },
  };
  const inserted = [];
  let performanceRows = [];

  const supabase = {
    from(table) {
      const state = { table, operation: 'select', filters: [], payload: null };
      const query = {
        select() { return this; },
        eq(field, value) { state.filters.push([field, value]); return this; },
        order() { return this; },
        limit() { return this; },
        insert(payload) { state.operation = 'insert'; state.payload = payload; return this; },
        single() {
          if (state.operation === 'insert') {
            const data = { id: `submission-${inserted.length + 1}`, ...deepClone(state.payload) };
            inserted.push(data);
            return Promise.resolve({ data, error: null });
          }
          if (table === 'dsa_problems') return Promise.resolve({ data: deepClone(problem), error: null });
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve, reject) {
          const rows = table === 'dsa_submissions' ? performanceRows : [];
          return Promise.resolve({ data: deepClone(rows), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };

  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'express' && parent?.filename === routePath) return { Router: () => router };
    if (request === '../config/supabase' && parent?.filename === routePath) return supabase;
    if (request === '../middleware/auth' && parent?.filename === routePath) return (_req, _res, next) => next?.();
    if (request === '../middleware/roles' && parent?.filename === routePath) return () => (_req, _res, next) => next?.();
    if (request === '../utils/coderunner' && parent?.filename === routePath) return { execute: localExecute };
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[routePath];
    assert.equal(require(routePath), router);
  } finally {
    Module._load = originalLoad;
    delete require.cache[routePath];
  }

  return {
    router,
    inserted,
    setPerformanceRows(rows) { performanceRows = rows; },
  };
}

async function invoke(handler, request) {
  const response = makeResponse();
  await handler(request, response);
  return response;
}

function typedProblem() {
  return {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Return two indices.',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    examples: [{ input: 'nums = [2, 7], target = 9', output: '[0, 1]' }],
    constraints: [],
    starter_code: {
      python: 'def twoSum(nums, target):\n    return []\n',
      javascript: 'function twoSum(nums, target) {\n  return [];\n}\n',
    },
    test_cases: {
      execution: { kind: 'call', method: 'twoSum', compare: 'strict', languages: ['python', 'javascript'] },
      cases: [
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { args: [[3, 2, 4], 6], expected: [1, 2] },
        { args: [[3, 3], 6], expected: [0, 1] },
      ],
    },
  };
}

function runnerSpec(kind, method, tests, className = null, compare = 'strict') {
  return {
    kind,
    method,
    className,
    compare,
    languages: ['python', 'javascript'],
    tests: tests.map(([args, expected]) => ({ args, expected })),
  };
}

function testTypedWrappers(harness) {
  const twoSum = harness.resolveTypedSpec({ title: 'Two Sum' });
  assert.ok(twoSum, 'Built-in Two Sum spec should resolve.');
  const pyTwoSum = runTyped(harness, {
    source: 'def twoSum(nums, target):\n    seen = {}\n    for i, value in enumerate(nums):\n        if target - value in seen:\n            return [seen[target - value], i]\n        seen[value] = i\n',
    language: 'python',
    spec: twoSum,
    args: [[2, 7, 11, 15], 9],
  });
  assert.deepEqual(pyTwoSum.actual, [0, 1]);
  const jsTwoSum = runTyped(harness, {
    source: 'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i += 1) { if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]; seen.set(nums[i], i); } }',
    language: 'javascript',
    spec: twoSum,
    args: [[2, 7, 11, 15], 9],
  });
  assert.deepEqual(jsTwoSum.actual, [0, 1]);

  // The marker must be fresh and captured output primitives must survive
  // learner monkey-patching of stdout/JSON facilities.
  const firstContext = harness.createFunctionRunnerContext();
  const secondContext = harness.createFunctionRunnerContext();
  assert.notEqual(firstContext.marker, secondContext.marker);
  const staticMarkerAttempt = runTyped(harness, {
    source: "console.log('__SMARTHIRE_RESULT__[999]'); process.stdout.write = () => {}; JSON.stringify = () => '\"spoof\"'; function twoSum() { return [0, 1]; }",
    language: 'javascript',
    spec: twoSum,
    args: [[2, 7], 9],
  });
  assert.deepEqual(staticMarkerAttempt.actual, [0, 1]);
  assert.equal(harness.stripFunctionResultMarker(staticMarkerAttempt.stdout, staticMarkerAttempt.marker).includes(staticMarkerAttempt.marker), false);
  const pythonPatchAttempt = runTyped(harness, {
    source: 'import json\njson.dumps = lambda *_args, **_kwargs: "spoof"\ndef twoSum(nums, target):\n    return [0, 1]\n',
    language: 'python',
    spec: twoSum,
    args: [[2, 7], 9],
  });
  assert.deepEqual(pythonPatchAttempt.actual, [0, 1]);

  const wrappers = [
    {
      label: 'linked list',
      spec: runnerSpec('linked-list', 'reverseList', [[[[1, 2, 3]], [3, 2, 1]]]),
      python: 'def reverseList(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n',
      javascript: 'function reverseList(head) { let prev = null; while (head) { const next = head.next; head.next = prev; prev = head; head = next; } return prev; }',
      args: [[1, 2, 3]], expected: [3, 2, 1],
    },
    {
      label: 'merge lists',
      spec: runnerSpec('merge-lists', 'mergeTwoLists', [[[[1, 3], [2, 4]], [1, 2, 3, 4]]]),
      python: 'def mergeTwoLists(a, b):\n    dummy = ListNode(); tail = dummy\n    while a and b:\n        if a.val < b.val: tail.next, a = a, a.next\n        else: tail.next, b = b, b.next\n        tail = tail.next\n    tail.next = a or b\n    return dummy.next\n',
      javascript: 'function mergeTwoLists(a, b) { const dummy = new ListNode(); let tail = dummy; while (a && b) { if (a.val < b.val) { tail.next = a; a = a.next; } else { tail.next = b; b = b.next; } tail = tail.next; } tail.next = a || b; return dummy.next; }',
      args: [[1, 3], [2, 4]], expected: [1, 2, 3, 4],
    },
    {
      label: 'cycle list',
      spec: runnerSpec('cycle-list', 'hasCycle', [[[[3, 2, 0, -4], 1], true]]),
      python: 'def hasCycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow, fast = slow.next, fast.next.next\n        if slow is fast: return True\n    return False\n',
      javascript: 'function hasCycle(head) { let slow = head; let fast = head; while (fast && fast.next) { slow = slow.next; fast = fast.next.next; if (slow === fast) return true; } return false; }',
      args: [[3, 2, 0, -4], 1], expected: true,
    },
    {
      label: 'LRU cache',
      spec: runnerSpec('lru-cache', null, [[[2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2]]], [1, -1]]], 'LRUCache'),
      python: 'class LRUCache:\n    def __init__(self, capacity): self.capacity, self.values = capacity, {}\n    def get(self, key):\n        if key not in self.values: return -1\n        value = self.values.pop(key); self.values[key] = value; return value\n    def put(self, key, value):\n        if key in self.values: self.values.pop(key)\n        self.values[key] = value\n        if len(self.values) > self.capacity: self.values.pop(next(iter(self.values)))\n',
      javascript: 'class LRUCache { constructor(capacity) { this.capacity = capacity; this.values = new Map(); } get(key) { if (!this.values.has(key)) return -1; const value = this.values.get(key); this.values.delete(key); this.values.set(key, value); return value; } put(key, value) { if (this.values.has(key)) this.values.delete(key); this.values.set(key, value); if (this.values.size > this.capacity) this.values.delete(this.values.keys().next().value); } }',
      args: [2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2]]], expected: [1, -1],
    },
    {
      label: 'min stack',
      spec: runnerSpec('min-stack', null, [[[[['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']]], [-3, 0, -2]]], 'MinStack'),
      python: 'class MinStack:\n    def __init__(self): self.values = []\n    def push(self, value): self.values.append(value)\n    def pop(self): return self.values.pop()\n    def top(self): return self.values[-1]\n    def getMin(self): return min(self.values)\n',
      javascript: 'class MinStack { constructor() { this.values = []; } push(value) { this.values.push(value); } pop() { return this.values.pop(); } top() { return this.values[this.values.length - 1]; } getMin() { return Math.min(...this.values); } }',
      args: [[['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']]], expected: [-3, 0, -2],
    },
    {
      label: 'tree call',
      spec: runnerSpec('tree-call', 'maxDepth', [[[[3, 9, 20, null, null, 15, 7]], 3]]),
      python: 'def maxDepth(root):\n    return 0 if root is None else 1 + max(maxDepth(root.left), maxDepth(root.right))\n',
      javascript: 'function maxDepth(root) { return root ? 1 + Math.max(maxDepth(root.left), maxDepth(root.right)) : 0; }',
      args: [[3, 9, 20, null, null, 15, 7]], expected: 3,
    },
    {
      label: 'tree result',
      spec: runnerSpec('tree-result', 'invertTree', [[[[4, 2, 7, 1, 3, 6, 9]], [4, 7, 2, 9, 6, 3, 1]]]),
      python: 'def invertTree(root):\n    if root:\n        root.left, root.right = invertTree(root.right), invertTree(root.left)\n    return root\n',
      javascript: 'function invertTree(root) { if (root) { const left = invertTree(root.right); root.right = invertTree(root.left); root.left = left; } return root; }',
      args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1],
    },
    {
      label: 'tree LCA',
      spec: runnerSpec('tree-lca', 'lowestCommonAncestor', [[[[6, 2, 8, 0, 4, 7, 9], 2, 8], 6]]),
      python: 'def lowestCommonAncestor(root, p, q):\n    while root:\n        if p.val < root.val and q.val < root.val: root = root.left\n        elif p.val > root.val and q.val > root.val: root = root.right\n        else: return root\n',
      javascript: 'function lowestCommonAncestor(root, p, q) { while (root) { if (p.val < root.val && q.val < root.val) root = root.left; else if (p.val > root.val && q.val > root.val) root = root.right; else return root; } }',
      args: [[6, 2, 8, 0, 4, 7, 9], 2, 8], expected: 6,
    },
    {
      label: 'clone graph serialization',
      spec: runnerSpec('clone-graph', 'cloneGraph', [[[[[2], [1]]], [[2], [1]]]]),
      python: 'def cloneGraph(node):\n    return node\n',
      javascript: 'function cloneGraph(node) { return node; }',
      args: [[[2], [1]]], expected: [[2], [1]],
    },
  ];

  for (const item of wrappers) {
    for (const language of ['python', 'javascript']) {
      assertTypedCase(harness, {
        label: `${item.label} (${language})`,
        source: item[language],
        language,
        spec: item.spec,
        args: item.args,
        expected: item.expected,
      });
    }
  }
}

function testPerformance(harness) {
  const rows = [
    { id: 'latest-wrong', status: 'Wrong Answer', language: 'javascript', runtime_ms: 8, submitted_at: '2026-10-11T12:00:00.000Z', dsa_problems: { id: 'p-easy', title: 'Two Sum', difficulty: 'Easy', tags: ['Array'] } },
    { id: 'older-accepted', status: 'Accepted', language: 'python', runtime_ms: 7, submitted_at: '2026-10-10T12:00:00.000Z', dsa_problems: { id: 'p-easy', title: 'Two Sum', difficulty: 'Easy', tags: ['Array'] } },
    { id: 'medium-accepted', status: 'Accepted', language: 'python', runtime_ms: 9, submitted_at: '2026-10-09T12:00:00.000Z', dsa_problems: { id: 'p-medium', title: 'Merge Intervals', difficulty: 'Medium', tags: ['Array', 'Intervals'] } },
    { id: 'unlinked', status: 'Accepted', language: 'python', runtime_ms: 1, submitted_at: '2026-10-08T12:00:00.000Z', dsa_problems: null },
  ];
  const performance = harness.buildDsaPerformance(rows);
  assert.equal(performance.totalAttempts, 4);
  assert.equal(performance.accepted, 3);
  assert.equal(performance.accuracy, 75);
  assert.equal(performance.uniqueProblemsSolved, 2, 'An earlier accepted attempt must remain solved after a later wrong answer.');
  assert.deepEqual(deepClone(performance.byDifficulty.Easy), { solved: 1, total: 1 });
  assert.deepEqual(deepClone(performance.byDifficulty.Medium), { solved: 1, total: 1 });
  assert.equal(performance.recentSubmissions.length, 4);
}

async function testRouteContract() {
  const problem = typedProblem();
  const { router, inserted, setPerformanceRows } = createRouteHarness(problem);
  const student = { id: 'student-1', role: 'student' };

  const detail = await invoke(router.getHandlers['/problems/:id'], { user: student, params: { id: problem.id } });
  assert.equal(detail.statusCode, 200);
  assert.equal(Object.hasOwn(detail.body.problem, 'test_cases'), false, 'Learner problem responses must not expose trusted cases.');
  assert.equal(detail.body.problem.function_execution.available, true);
  assert.deepEqual(detail.body.problem.function_execution.defaultArgs, [[2, 7, 11, 15], 9]);

  const run = await invoke(router.postHandlers['/run'], {
    user: student,
    body: {
      problemId: problem.id,
      executionMode: 'function',
      language: 'javascript',
      args: [[2, 7, 11, 15], 9],
      code: 'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i += 1) { if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]; seen.set(nums[i], i); } }',
    },
  });
  assert.equal(run.statusCode, 200);
  assert.deepEqual(run.body.actual, [0, 1]);
  assert.equal(Object.hasOwn(run.body, 'functionResultMarker'), false);
  assert.equal(run.body.stdout.includes('__SMARTHIRE_RESULT__'), false);

  const submit = await invoke(router.postHandlers['/submit'], {
    user: student,
    body: {
      problemId: problem.id,
      executionMode: 'function',
      language: 'javascript',
      code: 'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i += 1) { if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]; seen.set(nums[i], i); } }',
    },
  });
  assert.equal(submit.statusCode, 200);
  assert.equal(submit.body.status, 'Accepted');
  assert.equal(submit.body.passed, 3);
  assert.equal(inserted.length, 1);
  for (const result of submit.body.results) {
    for (const privateKey of ['input', 'args', 'expected', 'expectedValue', 'functionResultMarker']) {
      assert.equal(Object.hasOwn(result, privateKey), false, `Submission result leaked ${privateKey}.`);
    }
  }

  setPerformanceRows([
    { id: 'new-wrong', status: 'Wrong Answer', language: 'javascript', runtime_ms: 8, submitted_at: '2026-10-11T12:00:00.000Z', dsa_problems: { id: problem.id, title: problem.title, difficulty: 'Easy', tags: ['Array'] } },
    { id: 'old-accepted', status: 'Accepted', language: 'python', runtime_ms: 7, submitted_at: '2026-10-10T12:00:00.000Z', dsa_problems: { id: problem.id, title: problem.title, difficulty: 'Easy', tags: ['Array'] } },
  ]);
  const performance = await invoke(router.getHandlers['/performance'], { user: student });
  assert.equal(performance.statusCode, 200);
  assert.equal(performance.body.uniqueProblemsSolved, 1);
  assert.deepEqual(performance.body.byDifficulty.Easy, { solved: 1, total: 1 });
}

async function main() {
  const harness = loadHarness();
  testTypedWrappers(harness);
  testPerformance(harness);
  await testRouteContract();
  console.log('DSA function runner, private-test contract, and performance analytics: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
