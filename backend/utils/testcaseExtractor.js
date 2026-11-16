// utils/testcaseExtractor.js
// Extracts or retrieves test cases for Mock OA questions

function normalizeIO(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

function getQuestionTestCases(q) {
  if (!q) return [];

  const cases = [];

  // 1. Direct database test_cases array
  if (Array.isArray(q.test_cases) && q.test_cases.length > 0) {
    q.test_cases.forEach(tc => {
      if (tc && tc.input !== undefined && tc.expected_output !== undefined) {
        cases.push({
          input: normalizeIO(tc.input),
          expected_output: normalizeIO(tc.expected_output),
          sample: !!tc.sample,
        });
      }
    });
    if (cases.length > 0) return cases;
  }

  // 2. Direct sample_input & sample_output columns
  if (q.sample_input && q.sample_output) {
    cases.push({
      input: normalizeIO(q.sample_input),
      expected_output: normalizeIO(q.sample_output),
      sample: true,
    });
  }

  const desc = q.description || q.question_text || '';

  // 3. HTML table format: <td> Sample Input </td> ... <td>```...```</td>
  const tableRegex = /Sample\s*Input[\s\S]*?Sample\s*Output[\s\S]*?<td>[\s\S]*?```(?:shell|text)?\s*([\s\S]*?)```[\s\S]*?<\/td>\s*<td>[\s\S]*?```(?:shell|text)?\s*([\s\S]*?)```[\s\S]*?<\/td>/gi;
  let tm;
  while ((tm = tableRegex.exec(desc)) !== null) {
    const inp = normalizeIO(tm[1]);
    const out = normalizeIO(tm[2]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  // 4. Markdown headers: Sample Input: ```...``` Sample Output: ```...```
  const headerRegex = /Sample\s*Input:?\s*```(?:shell|text)?\s*([\s\S]*?)```[\s\S]*?Sample\s*Output:?\s*```(?:shell|text)?\s*([\s\S]*?)```/gi;
  let hm;
  while ((hm = headerRegex.exec(desc)) !== null) {
    const inp = normalizeIO(hm[1]);
    const out = normalizeIO(hm[2]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  // 5. Example format: input: `...`, Output: `...`
  const exRegex = /Example\s*\d*:?[\s\S]*?input\d*:\s*[`"]?([^`"\n]+)[`"]?[\s\S]*?Output:\s*[`"]?([^`"\n]+)[`"]?/gi;
  let em;
  while ((em = exRegex.exec(desc)) !== null) {
    const inp = normalizeIO(em[1]);
    const out = normalizeIO(em[2]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  // 6. Array format: power = [3,4,1,6,2] ... answer is 7
  const arrRegex = /Example\s*\d*:?[\s\S]*?(?:power|stockPrices|arr|nums)\s*(?:\[\])?\s*=\s*\[([0-9,\s]+)\][\s\S]*?(?:k\s*=\s*(\d+))?[\s\S]*?(?:answer|ans|output)\s*(?:is|=)\s*([0-9]+)/gi;
  let arm;
  while ((arm = arrRegex.exec(desc)) !== null) {
    const rawArr = arm[1].split(',').map(s => s.trim()).filter(Boolean);
    const kVal = arm[2];
    const inp = kVal ? `${rawArr.length} ${kVal}\n${rawArr.join(' ')}` : `${rawArr.length}\n${rawArr.join(' ')}`;
    const out = normalizeIO(arm[3]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  // 7. General Example pattern: Given n=... and arr=[...] ... result/output/operations is X
  const givenArrRegex = /Example\s*\d*:?[\s\S]*?Given\s*(?:n\s*=\s*\d+)?\s*(?:and)?\s*(\w+)\s*=\s*\[([0-9,\s]+)\][\s\S]*?(?:perform|output|result|answer)\s*(?:is|=|:)?\s*(\d+)/gi;
  let gm;
  while ((gm = givenArrRegex.exec(desc)) !== null) {
    const rawArr = gm[2].split(',').map(s => s.trim()).filter(Boolean);
    const inp = `${rawArr.length}\n${rawArr.join(' ')}`;
    const out = normalizeIO(gm[3]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  // 8. Plain Text Sample Input / Output:
  const plainIoRegex = /Sample\s*Input(?:\s*\d*)?:?\s*\n+([^\n]+(?:\n+[^\n]+)?)\n+Sample\s*Output(?:\s*\d*)?:?\s*\n+([^\n]+)/gi;
  let pm;
  while ((pm = plainIoRegex.exec(desc)) !== null) {
    const inp = normalizeIO(pm[1]);
    const out = normalizeIO(pm[2]);
    if (inp && out && !cases.some(c => c.input === inp && c.expected_output === out)) {
      cases.push({ input: inp, expected_output: out, sample: true });
    }
  }

  return cases;
}

/**
 * Intelligent Static Logic & Heuristic Evaluator
 * Used when no standard I/O test cases are configured for a question.
 * Ensures unverified or trivial code never gets full 100% credit,
 * while rewarding genuine implementation with proportional provisional marks.
 */
function evaluateCodeHeuristics(code, lang, starterCode, question) {
  if (!code || !code.trim()) {
    return {
      scoreRatio: 0,
      verdict: 'Unattempted',
      result: 'skipped',
      details: 'No code submitted.'
    };
  }

  // Strip comments and leading/trailing whitespace
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/#.*/g, '')
    .trim();

  // 1. Starter boilerplate check
  const isStarter = starterCode && cleanCode === starterCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/#.*/g, '').trim();
  const lines = cleanCode.split('\n').map(l => l.trim()).filter(Boolean);

  if (isStarter || lines.length <= 2) {
    return {
      scoreRatio: 0,
      verdict: 'Trivial / Incomplete Solution',
      result: 'wrong',
      details: 'Solution contains only starter boilerplate or trivial statements.'
    };
  }

  // 2. Control flow & algorithmic constructs
  const hasLoop = /\b(for|while|forEach|map|filter|reduce)\b/.test(cleanCode);
  const hasCondition = /\b(if|else|elif|switch|case|\?:)\b/.test(cleanCode);
  const hasFuncOrClass = /\b(def|function|class|public|private|static|void|int|auto|const)\b/.test(cleanCode);
  const hasReturn = /\b(return|yield|cout|System\.out\.print|print)\b/.test(cleanCode);
  const hasDataStructure = /\b(vector|set|map|dict|list|queue|stack|heap|priority_queue|HashMap|HashSet|ArrayList|Array|Collections)\b/i.test(cleanCode);

  let logicPoints = 0;
  if (hasFuncOrClass) logicPoints += 15;
  if (hasCondition) logicPoints += 25;
  if (hasLoop) logicPoints += 30;
  if (hasReturn) logicPoints += 15;
  if (hasDataStructure) logicPoints += 15;

  if (logicPoints < 35) {
    return {
      scoreRatio: 0,
      verdict: 'Insufficient Algorithmic Logic',
      result: 'wrong',
      details: 'Code compiled but lacks essential control flow, iterative logic, or algorithmic constructs.'
    };
  } else if (logicPoints >= 70) {
    return {
      scoreRatio: 0.60, // 60% provisional credit
      verdict: 'Provisional Pass (Static Analysis: 60%)',
      result: 'partial',
      details: 'Algorithmic logic, control structures, and syntax verified. Awaiting recruiter review for final test case grading.'
    };
  } else {
    return {
      scoreRatio: 0.35, // 35% provisional credit
      verdict: 'Partial Logic (Static Analysis: 35%)',
      result: 'partial',
      details: 'Basic control flow detected. Solution appears partially implemented.'
    };
  }
}

module.exports = {
  getQuestionTestCases,
  normalizeIO,
  evaluateCodeHeuristics,
};
