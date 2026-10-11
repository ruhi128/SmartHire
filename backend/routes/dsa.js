// routes/dsa.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { execute } = require('../utils/coderunner');
// ─────────────────────────────────────────────
// LeetCode-style typed-function execution
// ─────────────────────────────────────────────
// Learners submit only the required function or design class. The server adds
// a per-test driver, runs it through the existing server-side JDoodle bridge,
// reads one JSON return marker, and compares typed values. No JDoodle secret
// ever reaches the mobile client.
const FUNCTION_RESULT_MARKER = '__SMARTHIRE_RESULT__';
const FUNCTION_LANGUAGES = Object.freeze(['python', 'javascript']);
const FUNCTION_KINDS = new Set([
  'call', 'linked-list', 'merge-lists', 'cycle-list', 'lru-cache',
  'min-stack', 'tree-call', 'tree-result', 'tree-lca', 'clone-graph',
]);

const typedTest = (args, expected) => ({ args, expected });
const typedSpec = (kind, method, tests, compare = 'strict', className = null) => ({
  kind,
  method,
  tests,
  compare,
  className,
  languages: FUNCTION_LANGUAGES,
});
const typedCall = (method, tests, compare = 'strict') => typedSpec('call', method, tests, compare);

// These title aliases mirror the web practice bank. A database problem can
// opt into the same runner explicitly with test_cases shaped as:
// { execution: { kind, method, className?, compare?, languages? },
//   cases: [{ args: [...], expected: ... }] }
// The persisted format lets administrators add new typed problems without a
// schema change. The built-in aliases keep the established SmartHire bank
// available on mobile even where an older database record still has stdin
// test cases.
const BUILTIN_TYPED_SPECS = new Map([
  ['two sum', typedCall('twoSum', [
    typedTest([[2, 7, 11, 15], 9], [0, 1]),
    typedTest([[3, 2, 4], 6], [1, 2]),
  ])],
  ['pair sum', typedCall('twoSum', [
    typedTest([[2, 7, 11, 15], 9], [0, 1]),
    typedTest([[3, 2, 4], 6], [1, 2]),
  ])],
  ['best time to buy and sell stock', typedCall('maxProfit', [
    typedTest([[7, 1, 5, 3, 6, 4]], 5),
    typedTest([[7, 6, 4, 3, 1]], 0),
  ])],
  ['maximum subarray', typedCall('maxSubArray', [
    typedTest([[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6),
    typedTest([[1]], 1),
  ])],
  ['maximum subarray kadane', typedCall('maxSubArray', [
    typedTest([[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6),
    typedTest([[1]], 1),
  ])],
  ['container with most water', typedCall('maxArea', [
    typedTest([[1, 8, 6, 2, 5, 4, 8, 3, 7]], 49),
    typedTest([[1, 1]], 1),
  ])],
  ['trapping rain water', typedCall('trap', [
    typedTest([[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], 6),
    typedTest([[4, 2, 0, 3, 2, 5]], 9),
  ])],
  ['3sum', typedCall('threeSum', [
    typedTest([[-1, 0, 1, 2, -1, -4]], [[-1, -1, 2], [-1, 0, 1]]),
  ], 'deep-unordered')],

  ['valid palindrome', typedCall('isPalindrome', [
    typedTest(['A man, a plan, a canal: Panama'], true),
    typedTest(['race a car'], false),
  ])],
  ['normalized palindrome', typedCall('isPalindrome', [
    typedTest(['Never odd or even'], true),
    typedTest(['race a car'], false),
  ])],
  ['longest substring without repeating characters', typedCall('lengthOfLongestSubstring', [
    typedTest(['abcabcbb'], 3),
    typedTest(['bbbbb'], 1),
    typedTest(['pwwkew'], 3),
  ])],
  ['valid anagram', typedCall('isAnagram', [
    typedTest(['anagram', 'nagaram'], true),
    typedTest(['rat', 'car'], false),
  ])],
  ['longest palindromic substring', typedCall('longestPalindrome', [
    typedTest(['babad'], ['bab', 'aba']),
    typedTest(['cbbd'], ['bb']),
  ], 'one-of')],
  ['group anagrams', typedCall('groupAnagrams', [
    typedTest([['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]),
  ], 'deep-unordered')],

  ['reverse linked list', typedSpec('linked-list', 'reverseList', [
    typedTest([[1, 2, 3, 4, 5]], [5, 4, 3, 2, 1]),
    typedTest([[1, 2]], [2, 1]),
  ])],
  ['merge two sorted lists', typedSpec('merge-lists', 'mergeTwoLists', [
    typedTest([[1, 2, 4], [1, 3, 4]], [1, 1, 2, 3, 4, 4]),
  ])],
  ['linked list cycle', typedSpec('cycle-list', 'hasCycle', [
    typedTest([[3, 2, 0, -4], 1], true),
    typedTest([[1], -1], false),
  ])],
  ['lru cache', typedSpec('lru-cache', null, [
    typedTest([2, [
      ['put', 1, 1], ['put', 2, 2], ['get', 1],
      ['put', 3, 3], ['get', 2],
    ]], [1, -1]),
  ], 'strict', 'LRUCache')],

  ['maximum depth of binary tree', typedSpec('tree-call', 'maxDepth', [
    typedTest([[3, 9, 20, null, null, 15, 7]], 3),
    typedTest([[1]], 1),
  ])],
  ['invert binary tree', typedSpec('tree-result', 'invertTree', [
    typedTest([[4, 2, 7, 1, 3, 6, 9]], [4, 7, 2, 9, 6, 3, 1]),
  ])],
  ['lowest common ancestor of bst', typedSpec('tree-lca', 'lowestCommonAncestor', [
    typedTest([[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], 6),
    typedTest([[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], 2),
  ])],
  ['lowest common ancestor of a binary search tree', typedSpec('tree-lca', 'lowestCommonAncestor', [
    typedTest([[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], 6),
    typedTest([[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], 2),
  ])],
  ['binary tree level order traversal', typedSpec('tree-call', 'levelOrder', [
    typedTest([[3, 9, 20, null, null, 15, 7]], [[3], [9, 20], [15, 7]]),
  ])],
  ['binary tree maximum path sum', typedSpec('tree-call', 'maxPathSum', [
    typedTest([[-10, 9, 20, null, null, 15, 7]], 42),
  ])],

  ['number of islands', typedCall('numIslands', [
    typedTest([[['1', '1', '0'], ['0', '1', '0'], ['0', '0', '1']]], 2),
  ])],
  ['clone graph', typedSpec('clone-graph', 'cloneGraph', [
    typedTest([[[2, 4], [1, 3], [2, 4], [1, 3]]], [[2, 4], [1, 3], [2, 4], [1, 3]]),
  ])],
  ['course schedule', typedCall('canFinish', [
    typedTest([2, [[1, 0]]], true),
    typedTest([2, [[1, 0], [0, 1]]], false),
  ])],
  ['course schedule detect cycle in dag', typedCall('canFinish', [
    typedTest([2, [[1, 0]]], true),
    typedTest([2, [[1, 0], [0, 1]]], false),
  ])],

  ['climbing stairs', typedCall('climbStairs', [
    typedTest([2], 2), typedTest([3], 3), typedTest([5], 8),
  ])],
  ['coin change', typedCall('coinChange', [
    typedTest([[1, 5, 11], 11], 1),
    typedTest([[2], 3], -1),
    typedTest([[1, 2, 5], 11], 3),
  ])],
  ['longest common subsequence', typedCall('longestCommonSubsequence', [
    typedTest(['abcde', 'ace'], 3),
    typedTest(['abc', 'abc'], 3),
    typedTest(['abc', 'def'], 0),
  ])],
  ['0 1 knapsack', typedCall('knapsack', [
    typedTest([3, 5, [2, 3, 4], [3, 4, 5]], 7),
    typedTest([4, 8, [1, 3, 4, 5], [1, 4, 5, 7]], 11),
  ])],
  ['knapsack', typedCall('knapsack', [
    typedTest([3, 5, [2, 3, 4], [3, 4, 5]], 7),
    typedTest([4, 8, [1, 3, 4, 5], [1, 4, 5, 7]], 11),
  ])],
  ['word break', typedCall('wordBreak', [
    typedTest(['leetcode', ['leet', 'code']], true),
    typedTest(['applepenapple', ['apple', 'pen']], true),
    typedTest(['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], false),
  ])],

  ['valid parentheses', typedCall('isValid', [
    typedTest(['()[]{}'], true),
    typedTest(['(]'], false),
    typedTest(['{[]}'], true),
  ])],
  ['min stack', typedSpec('min-stack', null, [
    typedTest([[['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['getMin']]], [-3, -2]),
  ], 'strict', 'MinStack')],

  ['binary search', typedCall('search', [
    typedTest([[-1, 0, 3, 5, 9, 12], 9], 4),
    typedTest([[-1, 0, 3, 5, 9, 12], 2], -1),
  ])],
  ['find minimum in rotated sorted array', typedCall('findMin', [
    typedTest([[3, 4, 5, 1, 2]], 1),
    typedTest([[4, 5, 6, 7, 0, 1, 2]], 0),
  ])],

  ['kth largest element in array', typedCall('findKthLargest', [
    typedTest([[3, 2, 1, 5, 6, 4], 2], 5),
    typedTest([[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4),
  ])],
  ['top k frequent elements', typedCall('topKFrequent', [
    typedTest([[1, 1, 1, 2, 2, 3], 2], [1, 2]),
    typedTest([[1], 1], [1]),
  ], 'unordered-outer')],

  ['merge intervals', typedCall('merge', [
    typedTest([[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]),
    typedTest([[[1, 4], [4, 5]]], [[1, 5]]),
  ])],

  ['number of 1 bits hamming weight', typedCall('hammingWeight', [
    typedTest([11], 3), typedTest([128], 1),
  ])],
  ['number of 1 bits', typedCall('hammingWeight', [
    typedTest([11], 3), typedTest([128], 1),
  ])],
  ['reverse bits', typedCall('reverseBits', [
    typedTest([43261596], 964176192),
    typedTest([4294967293], 3221225471),
  ])],

  ['subsets', typedCall('subsets', [
    typedTest([[1, 2, 3]], [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]),
  ], 'deep-unordered')],
  ['permutations', typedCall('permute', [
    typedTest([[1, 2, 3]], [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]),
  ], 'unordered-outer')],
  ['sliding window maximum', typedCall('maxSlidingWindow', [
    typedTest([[1, 3, -1, -3, 5, 3, 6, 7], 3], [3, 3, 5, 5, 6, 7]),
  ])],
]);

function normalizedProblemTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cloneTypedSpec(spec) {
  return spec ? JSON.parse(JSON.stringify(spec)) : null;
}

function normaliseLanguages(languages) {
  // Omitted metadata means the standard verified Python/JavaScript pair.
  // An explicitly supplied empty/unsupported list must remain unavailable,
  // rather than silently changing an administrator's language policy.
  const values = languages === undefined || languages === null
    ? FUNCTION_LANGUAGES
    : (Array.isArray(languages) ? languages : [languages]);
  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()))]
    .filter((value) => FUNCTION_LANGUAGES.includes(value));
}

function normaliseTypedSpec(execution, cases) {
  if (!execution || typeof execution !== 'object' || !Array.isArray(cases) || !cases.length) return null;
  const kind = String(execution.kind || '').trim();
  if (!FUNCTION_KINDS.has(kind)) return null;

  const method = typeof execution.method === 'string' ? execution.method.trim() : null;
  const className = typeof execution.className === 'string' ? execution.className.trim() : null;
  const requiresMethod = !['lru-cache', 'min-stack'].includes(kind);
  const requiresClass = ['lru-cache', 'min-stack'].includes(kind);
  if ((requiresMethod && !method) || (requiresClass && !className)) return null;

  // Validate the original records before mapping: mapping `expected: undefined`
  // would itself create an `expected` property and could accidentally accept a
  // malformed administrator-provided test definition.
  if (cases.some((item) => !Array.isArray(item?.args)
    || !Object.prototype.hasOwnProperty.call(item || {}, 'expected'))) return null;
  const tests = cases.map((item) => ({
    args: item.args,
    expected: item.expected,
  }));

  const compare = ['strict', 'deep-unordered', 'unordered-outer', 'one-of'].includes(execution.compare)
    ? execution.compare
    : 'strict';
  return {
    kind,
    method,
    className,
    compare,
    languages: normaliseLanguages(execution.languages),
    tests,
  };
}

function storedTypedSpec(testCases) {
  if (!testCases) return null;
  if (!Array.isArray(testCases) && typeof testCases === 'object') {
    return normaliseTypedSpec(testCases.execution || testCases.runner, testCases.cases || testCases.tests);
  }
  // This secondary form is useful to administrators who keep the test-cases
  // column as an array: place the shared execution object on its first item.
  if (Array.isArray(testCases) && testCases.length && testCases[0]?.execution) {
    return normaliseTypedSpec(testCases[0].execution, testCases);
  }
  return null;
}

function resolveTypedSpec(problem) {
  const persisted = storedTypedSpec(problem?.test_cases);
  if (persisted) return persisted;
  return cloneTypedSpec(BUILTIN_TYPED_SPECS.get(normalizedProblemTitle(problem?.title)));
}

function fallbackFunctionParameterNames(spec) {
  const genericCount = Array.isArray(spec?.tests?.[0]?.args) ? spec.tests[0].args.length : 0;
  if (spec.kind === 'linked-list' || spec.kind === 'cycle-list') return ['head'];
  if (spec.kind === 'merge-lists') return ['list1', 'list2'];
  if (spec.kind === 'tree-call' || spec.kind === 'tree-result') return ['root'];
  if (spec.kind === 'tree-lca') return ['root', 'p', 'q'];
  if (spec.kind === 'clone-graph') return ['node'];
  return Array.from({ length: genericCount }, (_, index) => `arg${index + 1}`);
}

// Older database records can have a verified built-in title but no starter_code
// JSON. Supply a deliberately unfinished, language-safe fallback so mobile
// still presents the expected callable/class rather than disabling a problem
// that the server can grade correctly. A configured starter_code remains the
// preferred, problem-specific template.
function fallbackFunctionTemplates(spec) {
  if (spec.kind === 'lru-cache') {
    return {
      python: `class ${spec.className}:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        return -1\n\n    def put(self, key, value):\n        pass\n`,
      javascript: `class ${spec.className} {\n  constructor(capacity) {\n    // Initialize your cache.\n  }\n\n  get(key) {\n    return -1;\n  }\n\n  put(key, value) {\n    // Store or update the key.\n  }\n}\n`,
    };
  }
  if (spec.kind === 'min-stack') {
    return {
      python: `class ${spec.className}:\n    def __init__(self):\n        pass\n\n    def push(self, value):\n        pass\n\n    def pop(self):\n        pass\n\n    def top(self):\n        return None\n\n    def getMin(self):\n        return None\n`,
      javascript: `class ${spec.className} {\n  constructor() {\n    // Initialize your stack.\n  }\n\n  push(value) {\n    // Add a value.\n  }\n\n  pop() {\n    // Remove the top value.\n  }\n\n  top() {\n    return null;\n  }\n\n  getMin() {\n    return null;\n  }\n}\n`,
    };
  }

  const parameters = fallbackFunctionParameterNames(spec).join(', ');
  return {
    python: `def ${spec.method}(${parameters}):\n    # Implement the required function and return its result.\n    return None\n`,
    javascript: `function ${spec.method}(${parameters}) {\n  // Implement the required function and return its result.\n  return null;\n}\n`,
  };
}

function functionExecutionForClient(problem) {
  const spec = resolveTypedSpec(problem);
  if (!spec) {
    return {
      available: false,
      reason: 'This problem does not yet have verified function-execution metadata. It remains available to legacy stdin/stdout clients, but mobile will not grade it as a LeetCode-style function.',
    };
  }
  if (!spec.languages.length) {
    return {
      available: false,
      reason: 'This problem has no verified Python or JavaScript function-runner language. It is intentionally unavailable on mobile rather than being graded with an unsupported language.',
    };
  }
  return {
    available: true,
    mode: 'function',
    kind: spec.kind,
    method: spec.method || null,
    className: spec.className || null,
    languages: spec.languages,
    defaultArgs: spec.tests[0]?.args || [],
    testCount: spec.tests.length,
    starterTemplates: fallbackFunctionTemplates(spec),
  };
}

function shouldUseTypedRunner(problem, executionMode) {
  // Persisted typed metadata is authoritative. Built-in title aliases are only
  // selected when an upgraded client explicitly requests function execution,
  // preserving the legacy stdin/stdout API for older clients.
  return Boolean(storedTypedSpec(problem?.test_cases) || executionMode === 'function');
}

function createFunctionRunnerError(message, code = 'FUNCTION_RUNNER_ERROR', status = 422) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function assertTypedLanguage(spec, language) {
  const normalized = String(language || '').trim().toLowerCase();
  if (!spec.languages.length) {
    throw createFunctionRunnerError(
      'This problem has no verified Python or JavaScript function-runner language.',
      'TYPED_FUNCTION_LANGUAGE_UNSUPPORTED'
    );
  }
  if (!spec.languages.includes(normalized)) {
    throw createFunctionRunnerError(
      `LeetCode-style execution for this problem is available only in ${spec.languages.map((item) => item === 'javascript' ? 'JavaScript' : 'Python').join(' and ')}.`,
      'TYPED_FUNCTION_LANGUAGE_UNSUPPORTED'
    );
  }
  return normalized;
}

function pythonJsonLiteral(value) {
  return JSON.stringify(JSON.stringify(value));
}

const PYTHON_COMMON = `
import json as __sm_json

def __sm_emit(__sm_value):
    print("${FUNCTION_RESULT_MARKER}" + __sm_json.dumps(__sm_value, separators=(",", ":"), ensure_ascii=False))
`;

const PYTHON_LIST_HELPERS = `
class __SmartListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

ListNode = __SmartListNode

def __sm_make_list(__sm_values):
    __sm_dummy = __SmartListNode()
    __sm_tail = __sm_dummy
    for __sm_value in __sm_values:
        __sm_tail.next = __SmartListNode(__sm_value)
        __sm_tail = __sm_tail.next
    return __sm_dummy.next

def __sm_list_to_array(__sm_head):
    __sm_result, __sm_seen = [], set()
    while __sm_head is not None and id(__sm_head) not in __sm_seen:
        __sm_seen.add(id(__sm_head))
        __sm_result.append(__sm_head.val)
        __sm_head = __sm_head.next
    return __sm_result
`;

const PYTHON_TREE_HELPERS = `
class __SmartTreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

TreeNode = __SmartTreeNode

def __sm_build_tree(__sm_values):
    if not __sm_values or __sm_values[0] is None:
        return None
    __sm_root = __SmartTreeNode(__sm_values[0])
    __sm_queue = [__sm_root]
    __sm_index = 1
    while __sm_queue and __sm_index < len(__sm_values):
        __sm_node = __sm_queue.pop(0)
        if __sm_index < len(__sm_values):
            __sm_left = __sm_values[__sm_index]
            __sm_index += 1
            if __sm_left is not None:
                __sm_node.left = __SmartTreeNode(__sm_left)
                __sm_queue.append(__sm_node.left)
        if __sm_index < len(__sm_values):
            __sm_right = __sm_values[__sm_index]
            __sm_index += 1
            if __sm_right is not None:
                __sm_node.right = __SmartTreeNode(__sm_right)
                __sm_queue.append(__sm_node.right)
    return __sm_root

def __sm_tree_to_array(__sm_root):
    if __sm_root is None:
        return []
    __sm_result, __sm_queue = [], [__sm_root]
    while __sm_queue:
        __sm_node = __sm_queue.pop(0)
        if __sm_node is None:
            __sm_result.append(None)
            continue
        __sm_result.append(__sm_node.val)
        __sm_queue.append(__sm_node.left)
        __sm_queue.append(__sm_node.right)
    while __sm_result and __sm_result[-1] is None:
        __sm_result.pop()
    return __sm_result

def __sm_find_tree_node(__sm_root, __sm_value):
    if __sm_root is None:
        return None
    if __sm_root.val == __sm_value:
        return __sm_root
    return __sm_find_tree_node(__sm_root.left, __sm_value) or __sm_find_tree_node(__sm_root.right, __sm_value)
`;

const PYTHON_GRAPH_HELPERS = `
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = [] if neighbors is None else neighbors

def __sm_build_graph(__sm_adjacency):
    if not __sm_adjacency:
        return None
    __sm_nodes = [Node(__sm_index + 1) for __sm_index in range(len(__sm_adjacency))]
    for __sm_index, __sm_neighbors in enumerate(__sm_adjacency):
        __sm_nodes[__sm_index].neighbors = [__sm_nodes[__sm_value - 1] for __sm_value in __sm_neighbors]
    return __sm_nodes[0]

def __sm_graph_to_adjacency(__sm_start):
    if __sm_start is None:
        return []
    __sm_seen, __sm_queue, __sm_result = {}, [__sm_start], {}
    while __sm_queue:
        __sm_node = __sm_queue.pop(0)
        if __sm_node.val in __sm_seen:
            continue
        __sm_seen[__sm_node.val] = True
        __sm_result[__sm_node.val] = sorted(__sm_neighbor.val for __sm_neighbor in __sm_node.neighbors)
        __sm_queue.extend(__sm_node.neighbors)
    return [__sm_result[__sm_value] for __sm_value in sorted(__sm_result)]
`;

const JAVASCRIPT_COMMON = `
function __smEmit(value) {
  console.log('${FUNCTION_RESULT_MARKER}' + JSON.stringify(value));
}
`;

const JAVASCRIPT_LIST_HELPERS = `
// Assign on globalThis rather than declaring a lexical binding so a learner's
// own ListNode class can coexist with this fallback helper.
globalThis.ListNode = class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
};
function __smMakeList(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const value of values) {
    tail.next = new ListNode(value);
    tail = tail.next;
  }
  return dummy.next;
}
function __smListToArray(head) {
  const result = [];
  const seen = new Set();
  while (head && !seen.has(head)) {
    seen.add(head);
    result.push(head.val);
    head = head.next;
  }
  return result;
}
`;

const JAVASCRIPT_TREE_HELPERS = `
// See ListNode above: global assignment avoids a duplicate declaration when a
// starter template includes its own TreeNode implementation.
globalThis.TreeNode = class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
};
function __smBuildTree(values) {
  if (!values || values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let index = 1;
  while (queue.length && index < values.length) {
    const node = queue.shift();
    const left = values[index++];
    if (left !== undefined && left !== null) {
      node.left = new TreeNode(left);
      queue.push(node.left);
    }
    if (index < values.length) {
      const right = values[index++];
      if (right !== null) {
        node.right = new TreeNode(right);
        queue.push(node.right);
      }
    }
  }
  return root;
}
function __smTreeToArray(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!node) {
      result.push(null);
      continue;
    }
    result.push(node.val);
    queue.push(node.left || null, node.right || null);
  }
  while (result.length && result[result.length - 1] === null) result.pop();
  return result;
}
function __smFindTreeNode(root, value) {
  if (!root) return null;
  if (root.val === value) return root;
  return __smFindTreeNode(root.left, value) || __smFindTreeNode(root.right, value);
}
`;

const JAVASCRIPT_GRAPH_HELPERS = `
globalThis.Node = class Node {
  constructor(val = 0, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
};
function __smBuildGraph(adjacency) {
  if (!adjacency || adjacency.length === 0) return null;
  const nodes = adjacency.map((_, index) => new Node(index + 1));
  adjacency.forEach((neighbors, index) => {
    nodes[index].neighbors = neighbors.map((value) => nodes[value - 1]);
  });
  return nodes[0];
}
function __smGraphToAdjacency(start) {
  if (!start) return [];
  const queue = [start];
  const seen = new Map();
  while (queue.length) {
    const node = queue.shift();
    if (seen.has(node.val)) continue;
    seen.set(node.val, [...node.neighbors].map((neighbor) => neighbor.val).sort((a, b) => a - b));
    queue.push(...node.neighbors);
  }
  return [...seen.keys()].sort((a, b) => a - b).map((value) => seen.get(value));
}
`;

function buildPythonFunctionProgram(source, spec, args) {
  const encodedArgs = pythonJsonLiteral(args);
  const invoke = {
    call: `__sm_emit(${spec.method}(*__sm_args))`,
    'linked-list': `__sm_emit(__sm_list_to_array(${spec.method}(__sm_make_list(__sm_args[0]))))`,
    'merge-lists': `__sm_emit(__sm_list_to_array(${spec.method}(__sm_make_list(__sm_args[0]), __sm_make_list(__sm_args[1]))))`,
    'cycle-list': `
__sm_nodes = [__SmartListNode(__sm_value) for __sm_value in __sm_args[0]]
for __sm_index in range(len(__sm_nodes) - 1):
    __sm_nodes[__sm_index].next = __sm_nodes[__sm_index + 1]
if __sm_nodes and __sm_args[1] >= 0:
    __sm_nodes[-1].next = __sm_nodes[__sm_args[1]]
__sm_emit(${spec.method}(__sm_nodes[0] if __sm_nodes else None))`,
    'lru-cache': `
__sm_cache = ${spec.className}(__sm_args[0])
__sm_output = []
for __sm_operation in __sm_args[1]:
    __sm_name, __sm_values = __sm_operation[0], __sm_operation[1:]
    __sm_result = getattr(__sm_cache, __sm_name)(*__sm_values)
    if __sm_name == 'get':
        __sm_output.append(__sm_result)
__sm_emit(__sm_output)`,
    'min-stack': `
__sm_stack = ${spec.className}()
__sm_output = []
for __sm_operation in __sm_args[0]:
    __sm_name, __sm_values = __sm_operation[0], __sm_operation[1:]
    __sm_result = getattr(__sm_stack, __sm_name)(*__sm_values)
    if __sm_name in ('getMin', 'top'):
        __sm_output.append(__sm_result)
__sm_emit(__sm_output)`,
    'tree-call': `
__sm_root = __sm_build_tree(__sm_args[0])
__sm_emit(${spec.method}(__sm_root))`,
    'tree-result': `
__sm_root = __sm_build_tree(__sm_args[0])
__sm_emit(__sm_tree_to_array(${spec.method}(__sm_root)))`,
    'tree-lca': `
__sm_root = __sm_build_tree(__sm_args[0])
__sm_p = __sm_find_tree_node(__sm_root, __sm_args[1])
__sm_q = __sm_find_tree_node(__sm_root, __sm_args[2])
__sm_result = ${spec.method}(__sm_root, __sm_p, __sm_q)
__sm_emit(__sm_result.val if __sm_result is not None else None)`,
    'clone-graph': `
__sm_emit(__sm_graph_to_adjacency(${spec.method}(__sm_build_graph(__sm_args[0]))))`,
  }[spec.kind];
  if (!invoke) throw createFunctionRunnerError(`No Python function runner is defined for ${spec.kind}.`, 'FUNCTION_RUNNER_UNSUPPORTED');

  const helpers = [
    ['linked-list', 'merge-lists', 'cycle-list'].includes(spec.kind) ? PYTHON_LIST_HELPERS : '',
    ['tree-call', 'tree-result', 'tree-lca'].includes(spec.kind) ? PYTHON_TREE_HELPERS : '',
    spec.kind === 'clone-graph' ? PYTHON_GRAPH_HELPERS : '',
  ].join('\n');
  return `${source}\n${PYTHON_COMMON}\n${helpers}\n__sm_args = __sm_json.loads(${encodedArgs})\n${invoke}\n`;
}

function buildJavaScriptFunctionProgram(source, spec, args) {
  const encodedArgs = JSON.stringify(JSON.stringify(args));
  const invoke = {
    call: `__smEmit(${spec.method}(...__smArgs));`,
    'linked-list': `__smEmit(__smListToArray(${spec.method}(__smMakeList(__smArgs[0]))));`,
    'merge-lists': `__smEmit(__smListToArray(${spec.method}(__smMakeList(__smArgs[0]), __smMakeList(__smArgs[1]))));`,
    'cycle-list': `
const __smNodes = __smArgs[0].map((value) => new ListNode(value));
for (let index = 0; index < __smNodes.length - 1; index += 1) __smNodes[index].next = __smNodes[index + 1];
if (__smNodes.length && __smArgs[1] >= 0) __smNodes[__smNodes.length - 1].next = __smNodes[__smArgs[1]];
__smEmit(${spec.method}(__smNodes[0] || null));`,
    'lru-cache': `
const __smCache = new ${spec.className}(__smArgs[0]);
const __smOutput = [];
for (const __smOperation of __smArgs[1]) {
  const [__smName, ...__smValues] = __smOperation;
  const __smResult = __smCache[__smName](...__smValues);
  if (__smName === 'get') __smOutput.push(__smResult);
}
__smEmit(__smOutput);`,
    'min-stack': `
const __smStack = new ${spec.className}();
const __smOutput = [];
for (const __smOperation of __smArgs[0]) {
  const [__smName, ...__smValues] = __smOperation;
  const __smResult = __smStack[__smName](...__smValues);
  if (__smName === 'getMin' || __smName === 'top') __smOutput.push(__smResult);
}
__smEmit(__smOutput);`,
    'tree-call': `
const __smRoot = __smBuildTree(__smArgs[0]);
__smEmit(${spec.method}(__smRoot));`,
    'tree-result': `
const __smRoot = __smBuildTree(__smArgs[0]);
__smEmit(__smTreeToArray(${spec.method}(__smRoot)));`,
    'tree-lca': `
const __smRoot = __smBuildTree(__smArgs[0]);
const __smResult = ${spec.method}(__smRoot, __smFindTreeNode(__smRoot, __smArgs[1]), __smFindTreeNode(__smRoot, __smArgs[2]));
__smEmit(__smResult ? __smResult.val : null);`,
    'clone-graph': `__smEmit(__smGraphToAdjacency(${spec.method}(__smBuildGraph(__smArgs[0]))));`,
  }[spec.kind];
  if (!invoke) throw createFunctionRunnerError(`No JavaScript function runner is defined for ${spec.kind}.`, 'FUNCTION_RUNNER_UNSUPPORTED');

  const helpers = [
    ['linked-list', 'merge-lists', 'cycle-list'].includes(spec.kind) ? JAVASCRIPT_LIST_HELPERS : '',
    ['tree-call', 'tree-result', 'tree-lca'].includes(spec.kind) ? JAVASCRIPT_TREE_HELPERS : '',
    spec.kind === 'clone-graph' ? JAVASCRIPT_GRAPH_HELPERS : '',
  ].join('\n');
  return `${source}\n${JAVASCRIPT_COMMON}\n${helpers}\nconst __smArgs = JSON.parse(${encodedArgs});\n${invoke}\n`;
}

function buildFunctionProgram(source, language, spec, args) {
  const normalizedLanguage = assertTypedLanguage(spec, language);
  if (!Array.isArray(args)) {
    throw createFunctionRunnerError('Custom test data must be a JSON array of function arguments.', 'FUNCTION_ARGUMENTS_INVALID');
  }
  return normalizedLanguage === 'python'
    ? buildPythonFunctionProgram(source, spec, args)
    : buildJavaScriptFunctionProgram(source, spec, args);
}

function parseFunctionOutput(stdout) {
  const output = String(stdout || '');
  const markerIndex = output.lastIndexOf(FUNCTION_RESULT_MARKER);
  if (markerIndex === -1) {
    throw createFunctionRunnerError(
      'Your code finished without returning a result. Keep the required function or class name and return a JSON-compatible value; do not read stdin or print the final answer.',
      'FUNCTION_RESULT_MISSING'
    );
  }
  const payload = output.slice(markerIndex + FUNCTION_RESULT_MARKER.length).trim().split(/\r?\n/, 1)[0];
  try {
    return JSON.parse(payload);
  } catch {
    throw createFunctionRunnerError(
      'The function runner could not read the returned value. Return JSON-compatible numbers, strings, booleans, arrays, lists, or trees.',
      'FUNCTION_RESULT_INVALID'
    );
  }
}

// The marker is an internal transport detail. Keep a learner's own diagnostic
// prints visible for Run, but do not show the serialized harness marker in the
// mobile editor UI alongside the separately rendered returned value.
function stripFunctionResultMarker(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => {
      const markerIndex = line.indexOf(FUNCTION_RESULT_MARKER);
      return markerIndex === -1 ? line : line.slice(0, markerIndex).trimEnd();
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function stableTypedValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableTypedValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableTypedValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeDeepUnordered(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeDeepUnordered).sort((left, right) => stableTypedValue(left).localeCompare(stableTypedValue(right)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeDeepUnordered(value[key])]));
  }
  return value;
}

function normalizeOuterUnordered(value) {
  return Array.isArray(value)
    ? [...value].sort((left, right) => stableTypedValue(left).localeCompare(stableTypedValue(right)))
    : value;
}

function typedValuesMatch(actual, expected, compare = 'strict') {
  if (compare === 'deep-unordered') {
    return stableTypedValue(normalizeDeepUnordered(actual)) === stableTypedValue(normalizeDeepUnordered(expected));
  }
  if (compare === 'unordered-outer') {
    return stableTypedValue(normalizeOuterUnordered(actual)) === stableTypedValue(normalizeOuterUnordered(expected));
  }
  if (compare === 'one-of') return Array.isArray(expected) && expected.includes(actual);
  return stableTypedValue(actual) === stableTypedValue(expected);
}

function displayTypedValue(value) {
  try {
    const serialised = JSON.stringify(value);
    return serialised === undefined ? String(value) : serialised;
  } catch {
    return String(value);
  }
}

async function executeTypedFunctionCase(code, language, spec, args) {
  const program = buildFunctionProgram(code, language, spec, args);
  const execution = await execute(program, language, '');
  // Deliberately omit `actual` when the runner did not complete. Callers use
  // property presence to distinguish an unavailable return value from a valid
  // JSON return such as null, false, 0, or an empty array.
  if (execution.verdict !== 'Accepted') return execution;
  return { ...execution, actual: parseFunctionOutput(execution.stdout) };
}


// ─────────────────────────────────────────────
// GET /api/dsa/problems
// List all DSA problems (with optional filters)
// Query: ?difficulty=Easy&tag=Array&search=two+sum
// ─────────────────────────────────────────────
router.get('/problems', auth, async (req, res) => {
  try {
    const { difficulty, tag, search } = req.query;

    let query = supabaseAdmin
      .from('dsa_problems')
      .select('id, title, difficulty, tags, created_at');

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    // For each problem, check if this student has solved it
    const { data: solved } = await supabaseAdmin
      .from('dsa_submissions')
      .select('problem_id')
      .eq('student_id', req.user.id)
      .eq('status', 'Accepted');

    const solvedIds = new Set((solved || []).map(s => s.problem_id));

    const enriched = (data || []).map(p => ({
      ...p,
      solved: solvedIds.has(p.id),
    }));

    res.json({ problems: enriched });
  } catch (err) {
    console.error('GET /dsa/problems error:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// ─────────────────────────────────────────────
// GET /api/dsa/problems/:id
// Get a single problem with full details
// ─────────────────────────────────────────────
router.get('/problems/:id', auth, async (req, res) => {
  try {
    const { data: problem, error } = await supabaseAdmin
      .from('dsa_problems')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Fetch this student's previous submissions for this problem
    const { data: submissions } = await supabaseAdmin
      .from('dsa_submissions')
      .select('id, language, status, runtime_ms, memory_mb, submitted_at')
      .eq('student_id', req.user.id)
      .eq('problem_id', req.params.id)
      .order('submitted_at', { ascending: false })
      .limit(10);

    const functionExecution = functionExecutionForClient(problem);
    res.json({
      problem: { ...problem, function_execution: functionExecution },
      submissions: submissions || [],
    });
  } catch (err) {
    console.error('GET /dsa/problems/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/submit
// Submit code → server-authoritative test suite → save result
// Body: { problemId, code, language, executionMode?: 'function' }
// ─────────────────────────────────────────────
router.post('/submit', auth, roles('student'), async (req, res) => {
  const problemId = req.body.problemId || req.body.problem_id;
  const { code, language, executionMode } = req.body;

  if (!problemId || !code || !language) {
    return res.status(400).json({ error: 'problemId, code, and language are required' });
  }

  try {
    const { data: problem, error: pErr } = await supabaseAdmin
      .from('dsa_problems')
      .select('test_cases, title')
      .eq('id', problemId)
      .single();

    if (pErr || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const useTypedRunner = shouldUseTypedRunner(problem, executionMode);
    if (useTypedRunner) {
      const spec = resolveTypedSpec(problem);
      if (!spec) {
        return res.status(422).json({
          error: 'This problem does not yet have verified LeetCode-style execution metadata.',
          code: 'TYPED_FUNCTION_UNAVAILABLE',
        });
      }

      const normalizedLanguage = assertTypedLanguage(spec, language);
      let passedCount = 0;
      let totalRuntime = 0;
      let totalMemory = 0;
      let firstError = null;
      let hasRuntimeFailure = false;
      const results = [];

      // Submission test cases and comparison rules are resolved only on the
      // server. Mobile can never send an expected value or alter grading.
      for (let i = 0; i < spec.tests.length; i += 1) {
        const test = spec.tests[i];
        let execution;
        try {
          execution = await executeTypedFunctionCase(code, normalizedLanguage, spec, test.args);
        } catch (execErr) {
          // JDoodle/configuration failures are infrastructure errors, not a
          // learner runtime error. Return their actionable provider message.
          if (Number.isInteger(execErr.status) && !String(execErr.code || '').startsWith('FUNCTION_RESULT_')) {
            throw execErr;
          }
          execution = {
            verdict: 'Runtime Error',
            stdout: '',
            stderr: execErr.message || 'The function runner could not execute this test.',
            time: 'N/A',
            memory: 'N/A',
            engine: null,
          };
        }

        const hasActual = Object.prototype.hasOwnProperty.call(execution, 'actual');
        const passed = execution.verdict === 'Accepted'
          && hasActual
          && typedValuesMatch(execution.actual, test.expected, spec.compare);
        if (passed) passedCount += 1;
        if (execution.verdict !== 'Accepted') hasRuntimeFailure = true;
        if (!passed && !firstError) firstError = execution.stderr || (hasActual ? 'Returned value did not match the expected value.' : 'No returned value.');

        totalRuntime += parseFloat(execution.time) || 0;
        totalMemory += parseFloat(execution.memory) || 0;
        results.push({
          testCase: i + 1,
          passed,
          input: displayTypedValue(test.args),
          args: test.args,
          expected: displayTypedValue(test.expected),
          expectedValue: test.expected,
          output: hasActual ? displayTypedValue(execution.actual) : (execution.stderr || execution.stdout || ''),
          actual: hasActual ? execution.actual : null,
          runtime: execution.time,
          memory: execution.memory,
          engine: execution.engine,
          verdict: execution.verdict,
          stderr: execution.stderr || '',
        });
      }

      const avgRuntime = spec.tests.length > 0
        ? Math.round((totalRuntime / spec.tests.length) * 1000)
        : 0;
      const avgMemory = spec.tests.length > 0
        ? parseFloat((totalMemory / spec.tests.length).toFixed(2))
        : 0;
      const overallStatus = passedCount === spec.tests.length
        ? 'Accepted'
        : (hasRuntimeFailure ? 'Runtime Error' : 'Wrong Answer');

      const { data: submission, error: subErr } = await supabaseAdmin
        .from('dsa_submissions')
        .insert({
          student_id: req.user.id,
          problem_id: problemId,
          language: normalizedLanguage,
          code,
          status: overallStatus,
          runtime_ms: avgRuntime,
          memory_mb: avgMemory,
          test_cases_passed: passedCount,
        })
        .select()
        .single();
      if (subErr) throw subErr;

      return res.json({
        submissionId: submission.id,
        status: overallStatus,
        passed: passedCount,
        total: spec.tests.length,
        runtime: `${avgRuntime}ms`,
        memory: `${avgMemory}KB`,
        engine: results.find((result) => result.engine)?.engine || null,
        results,
        error: firstError,
        executionMode: 'function',
        function_execution: functionExecutionForClient(problem),
      });
    }

    // Legacy raw-stdin behavior is deliberately retained for web and older
    // clients. Title fallbacks do not change it unless executionMode=function
    // was explicitly requested by an upgraded client.
    const testCases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
    let passedCount = 0;
    let totalRuntime = 0;
    let totalMemory = 0;
    let firstError = null;
    let overallStatus = 'Accepted';
    const results = [];

    for (let i = 0; i < testCases.length; i += 1) {
      const tc = testCases[i];
      try {
        const result = await execute(code, language, tc.input);
        const output = (result.stdout || '').trim();
        const expected = (tc.expected_output || '').trim();
        const passed = output === expected;

        if (passed) passedCount += 1;
        totalRuntime += parseFloat(result.time) || 0;
        totalMemory += parseFloat(result.memory) || 0;

        results.push({
          testCase: i + 1,
          passed,
          input: tc.input,
          expected,
          output,
          runtime: result.time,
          memory: result.memory,
          engine: result.engine,
        });

        if (!passed && overallStatus === 'Accepted') {
          overallStatus = result.verdict === 'Accepted' ? 'Wrong Answer' : result.verdict;
          if (!firstError) firstError = result.stderr || result.verdict;
        }
      } catch (execErr) {
        if (Number.isInteger(execErr.status)) throw execErr;
        overallStatus = 'Runtime Error';
        firstError = execErr.message;
        results.push({
          testCase: i + 1,
          passed: false,
          input: tc.input,
          expected: tc.expected_output,
          output: '',
          error: execErr.message,
        });
      }
    }

    const avgRuntime = testCases.length > 0 ? Math.round((totalRuntime / testCases.length) * 1000) : 0;
    const avgMemory = testCases.length > 0 ? parseFloat((totalMemory / testCases.length).toFixed(2)) : 0;
    const { data: submission, error: subErr } = await supabaseAdmin
      .from('dsa_submissions')
      .insert({
        student_id: req.user.id,
        problem_id: problemId,
        language,
        code,
        status: overallStatus,
        runtime_ms: avgRuntime,
        memory_mb: avgMemory,
        test_cases_passed: passedCount,
      })
      .select()
      .single();
    if (subErr) throw subErr;

    res.json({
      submissionId: submission.id,
      status: overallStatus,
      passed: passedCount,
      total: testCases.length,
      runtime: `${avgRuntime}ms`,
      memory: `${avgMemory}KB`,
      engine: results.find((result) => result.engine)?.engine || null,
      results,
      error: firstError,
    });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    const errorCode = err.code || 'DSA_SUBMISSION_FAILED';
    console.error('POST /dsa/submit error:', { code: errorCode, message: err.message });
    res.status(status).json({
      error: err.message || 'Submission failed',
      code: errorCode,
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/run  (Run once without recording a submission)
// Body: { code, language, customInput?, problemId?, executionMode?, args? }
// ─────────────────────────────────────────────
router.post('/run', auth, roles('student'), async (req, res) => {
  const {
    code,
    language,
    customInput = '',
    input,
    problemId: bodyProblemId,
    problem_id,
    executionMode,
    args,
  } = req.body;
  const problemId = bodyProblemId || problem_id;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  try {
    // A function/class Run has no meaningful stdin fallback. Require a known
    // problem so the server can select its trusted signature and typed driver.
    if (executionMode === 'function' && !problemId) {
      return res.status(400).json({
        error: 'problemId is required for LeetCode-style Run.',
        code: 'TYPED_FUNCTION_PROBLEM_REQUIRED',
      });
    }

    let problem = null;
    if (problemId) {
      const { data, error } = await supabaseAdmin
        .from('dsa_problems')
        .select('id, title, test_cases')
        .eq('id', problemId)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Problem not found' });
      problem = data;
    }

    if (problem && shouldUseTypedRunner(problem, executionMode)) {
      const spec = resolveTypedSpec(problem);
      if (!spec) {
        return res.status(422).json({
          error: 'This problem does not yet have verified LeetCode-style execution metadata.',
          code: 'TYPED_FUNCTION_UNAVAILABLE',
        });
      }
      const normalizedLanguage = assertTypedLanguage(spec, language);
      if (!Array.isArray(args)) {
        return res.status(400).json({
          error: 'For LeetCode-style Run, args must be a JSON array of function arguments.',
          code: 'FUNCTION_ARGUMENTS_INVALID',
        });
      }

      try {
        const execution = await executeTypedFunctionCase(code, normalizedLanguage, spec, args);
        const hasActual = Object.prototype.hasOwnProperty.call(execution, 'actual');
        return res.json({
          stdout: stripFunctionResultMarker(execution.stdout),
          stderr: execution.stderr || '',
          verdict: execution.verdict,
          time: execution.time,
          memory: execution.memory,
          engine: execution.engine,
          actual: hasActual ? execution.actual : null,
          actualDisplay: hasActual ? displayTypedValue(execution.actual) : null,
          args,
          executionMode: 'function',
          function_execution: functionExecutionForClient(problem),
        });
      } catch (execErr) {
        const status = Number.isInteger(execErr.status) ? execErr.status : 422;
        return res.status(status).json({
          error: execErr.message || 'The function runner could not execute this code.',
          code: execErr.code || 'FUNCTION_RUNNER_ERROR',
          engine: 'JDoodle Cloud API',
        });
      }
    }

    const result = await execute(code, language, customInput || input || '');
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      verdict: result.verdict,
      time: result.time,
      memory: result.memory,
      engine: result.engine,
    });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    const errorCode = err.code || 'CODE_EXECUTION_FAILED';
    console.error('POST /dsa/run error:', { code: errorCode, message: err.message });
    res.status(status).json({
      error: err.message || 'Code execution failed',
      code: errorCode,
      engine: 'JDoodle Cloud API',
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/dsa/performance
// Student's DSA performance analytics
// ─────────────────────────────────────────────
router.get('/performance', auth, roles('student'), async (req, res) => {
  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('dsa_submissions')
      .select(`
        id, status, language, runtime_ms, memory_mb,
        test_cases_passed, submitted_at,
        dsa_problems(id, title, difficulty, tags)
      `)
      .eq('student_id', req.user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Aggregate stats
    const totalAttempts = submissions.length;
    const accepted = submissions.filter(s => s.status === 'Accepted').length;
    const accuracy = totalAttempts > 0
      ? Math.round((accepted / totalAttempts) * 100)
      : 0;

    // By difficulty
    const difficultyMap = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
    const seenProblems = new Map();

    for (const sub of submissions) {
      const prob = sub.dsa_problems;
      if (!prob) continue;
      const diff = prob.difficulty;
      if (!seenProblems.has(prob.id)) {
        seenProblems.set(prob.id, sub.status);
        difficultyMap[diff].total++;
        if (sub.status === 'Accepted') difficultyMap[diff].solved++;
      }
    }

    // Topic-wise performance from tags
    const topicMap = {};
    for (const sub of submissions) {
      const tags = sub.dsa_problems?.tags || [];
      for (const tag of tags) {
        if (!topicMap[tag]) topicMap[tag] = { attempted: 0, solved: 0 };
        topicMap[tag].attempted++;
        if (sub.status === 'Accepted') topicMap[tag].solved++;
      }
    }

    const topicStats = Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      attempted: stats.attempted,
      solved: stats.solved,
      accuracy: Math.round((stats.solved / stats.attempted) * 100),
    }));

    // Recent 10 submissions for activity feed
    const recent = submissions.slice(0, 10).map(s => ({
      id: s.id,
      title: s.dsa_problems?.title,
      difficulty: s.dsa_problems?.difficulty,
      status: s.status,
      language: s.language,
      runtime: s.runtime_ms,
      submittedAt: s.submitted_at,
    }));

    res.json({
      totalAttempts,
      accepted,
      accuracy,
      uniqueProblemsSolved: [...seenProblems.values()].filter(v => v === 'Accepted').length,
      byDifficulty: difficultyMap,
      topicStats,
      recentSubmissions: recent,
    });
  } catch (err) {
    console.error('GET /dsa/performance error:', err);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/problems  (Admin: Add new problem)
// ─────────────────────────────────────────────
router.post('/problems', auth, roles('admin'), async (req, res) => {
  const { title, description, difficulty, tags, examples, constraints, testCases, starterCode } = req.body;

  if (!title || !description || !difficulty) {
    return res.status(400).json({ error: 'title, description, difficulty required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('dsa_problems')
      .insert({
        title,
        description,
        difficulty,
        tags: tags || [],
        examples: examples || [],
        constraints: constraints || [],
        test_cases: testCases || [],
        starter_code: starterCode || {},
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ problem: data });
  } catch (err) {
    console.error('POST /dsa/problems error:', err);
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

module.exports = router;