// src/pages/student/MockOA.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/axios';
import {
  Clock, Search, Building2, ChevronLeft, ChevronRight,
  Send, AlertTriangle, CheckCircle, XCircle, BarChart2,
  Eye, EyeOff, Flag, RefreshCw, TrendingUp, Award,
  Code2, Brain, Cpu, Database, Globe, Layers,
  Monitor, Wifi, BookOpen, Star, Sparkles,
  Play, Terminal, Check, RotateCcw, Copy
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import ProctorLayer, { computeIntegrity } from '../../components/ProctorLayer';

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  bg: 'var(--bg-base)', card: 'var(--bg-card)', cardB: 'var(--bg-card-raised)',
  cyan: '#4f46e5', green: '#16a34a', amber: '#d97706',
  red: '#dc2626', violet: '#4f46e5',
  gray: '#475569', light: 'var(--text-secondary)', white: 'var(--text-primary)',
};
const TYPE_COLOR = { aptitude: C.cyan, technical: C.violet, behavioural: C.amber };
const TYPE_ICON  = { aptitude: Brain, technical: Cpu, behavioural: BookOpen };

// ── Supported Execution Languages & Starter Templates ───────────────────────
const CODE_LANGUAGES = [
  { id: 'python3', label: 'Python 3', ext: '.py' },
  { id: 'cpp', label: 'C++ 17', ext: '.cpp' },
  { id: 'java', label: 'Java (OpenJDK)', ext: '.java' },
  { id: 'javascript', label: 'JavaScript (Node.js)', ext: '.js' },
];

const STARTER_BOILERPLATES = {
  python3: `# Write your Python 3 solution here\nimport sys\n\ndef solve():\n    # Read from standard input if required\n    # lines = sys.stdin.read().splitlines()\n    print("Program executed successfully")\n\nif __name__ == '__main__':\n    solve()\n`,
  cpp: `// Write your C++ 17 solution here\n#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nvoid solve() {\n    // Write your solution logic here\n    cout << "Program executed successfully" << endl;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    solve();\n    return 0;\n}\n`,
  java: `// Write your Java solution here\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Read input using Scanner if required\n        System.out.println("Program executed successfully");\n    }\n}\n`,
  javascript: `// Write your JavaScript (Node.js) solution here\nconst fs = require('fs');\n\nfunction solve() {\n    console.log("Program executed successfully");\n}\n\nsolve();\n`,
};

// ── Boilerplate & Empty Code Detector ───────────────────────────────────────
function isBoilerplateOrEmpty(code, lang, starterCode) {
  if (!code || typeof code !== 'string') return true;
  const trimmed = code.trim();
  if (trimmed.length === 0) return true;

  const normalize = (s) => (s || '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const normCode = normalize(code);

  if (starterCode && normCode === normalize(starterCode)) return true;

  for (const b of Object.values(STARTER_BOILERPLATES)) {
    if (normCode === normalize(b)) return true;
  }

  // Strip comments, imports, template prints, and wrapper syntax
  let stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/["']Program executed successfully["']/gi, '')
    .replace(/import\s+[^\n;]+;?/gi, '')
    .replace(/from\s+\w+\s+import\s+[^\n;]+;?/gi, '')
    .replace(/#include\s+<[^>]+>/gi, '')
    .replace(/using\s+namespace\s+\w+;?/gi, '')
    .replace(/const\s+\w+\s*=\s*require\([^)]+\);?/gi, '')
    .replace(/ios_base::sync_with_stdio\(false\);?/gi, '')
    .replace(/cin\.tie\(NULL\);?/gi, '')
    .replace(/if\s*__name__\s*==\s*['"]__main__['"]\s*:/gi, '')
    .replace(/public\s+class\s+\w+\s*\{?/gi, '')
    .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{?/gi, '')
    .replace(/def\s+solve\s*\([^)]*\)\s*:\s*(pass)?/gi, '')
    .replace(/void\s+solve\s*\([^)]*\)\s*\{?\s*\}?/gi, '')
    .replace(/function\s+solve\s*\([^)]*\)\s*\{?\s*\}?/gi, '')
    .replace(/return\s+0;?/gi, '')
    .replace(/solve\(\);?/gi, '')
    .replace(/[{}();:\s]/g, '');

  if (stripped.length < 12) {
    // Short, valid echo solutions (for example print(input())) must still
    // reach private server grading; only reject comments/no-op templates.
    const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(?:\/\/|#)[^\n]*/gm, '');
    const hasWork = /\b(?:input|stdin|read|print|printf|cout|return)\b|console\.log|System\.out\.print/.test(withoutComments);
    return !hasWork || /Program executed successfully/i.test(withoutComments);
  }

  return false;
}


// ── Format Question Description to Rich HTML ─────────────────────────────
function formatMarkdown(md) {
  if (!md) return '';
  // Test descriptions are recruiter-authored: escape raw HTML before adding
  // only the small set of supported formatting tags below.
  let out = String(md).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safeUrl = (url) => /^https?:\/\/[^\s]+$/i.test(url.trim()) ? url.trim() : null;

  // 1. Fenced code blocks ```...```
  out = out.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<div style="margin:12px 0;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--bg-base);"><div style="padding:12px 14px;font-family:'JetBrains Mono',Consolas,monospace;font-size:13px;color:var(--text-primary);white-space:pre-wrap;line-height:1.55;font-weight:500;">${code.trim()}</div></div>`;
  });

  // 2. LaTeX formatting & symbols
  out = out
    // \textbf{...} -> <strong>...</strong>
    .replace(/\\textbf\{([^}]+)\}/g, '<strong style="color:var(--text-primary);font-weight:700;">$1</strong>')
    // \textit{...} -> <em>...</em>
    .replace(/\\textit\{([^}]+)\}/g, '<em style="color:var(--text-primary);font-style:italic;">$1</em>')
    // \text{...} -> ...
    .replace(/\\text\{([^}]+)\}/g, '$1')
    // \texttt{...} -> <code>...</code>
    .replace(/\\texttt\{([^}]+)\}/g, '<code style="background:rgba(125,125,125,0.12);padding:2px 6px;border-radius:5px;color:#4f46e5;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;">$1</code>')
    // \rm{...} -> ...
    .replace(/\\rm\{([^}]+)\}/g, '$1')
    // Escaped spaces: "\ " -> " "
    .replace(/\\\s+/g, ' ')
    // Subscripts: a_1 -> a₁ or a<sub>1</sub>, a_N -> a<sub>N</sub>
    .replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>')
    .replace(/([a-zA-Z0-9])_([0-9a-zA-Z]+)/g, '$1<sub>$2</sub>')
    .replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, '$1<sup>$2</sup>')
    .replace(/([a-zA-Z0-9])\^([0-9a-zA-Z]+)/g, '$1<sup>$2</sup>')
    // LaTeX math symbols
    .replace(/\\leq\b|\\le\b/g, '≤')
    .replace(/\\geq\b|\\ge\b/g, '≥')
    .replace(/\\neq\b|\\ne\b/g, '≠')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\dots\b|\\ldots\b|\\cdots\b/g, '...')
    .replace(/\\lt\b/g, '&lt;')
    .replace(/\\gt\b/g, '&gt;')
    // Inline math $...$
    .replace(/\$10\^(\d+)\$/g, '10<sup>$1</sup>')
    .replace(/\$([^$\n]+)\$/g, '<span style="font-family:\'JetBrains Mono\',Consolas,monospace;font-weight:600;color:var(--text-primary);">$1</span>');

  // 3. Section Titles (Input Format, Output Format, Constraints, etc.)
  out = out.replace(/^(Input Format|Output Format|Constraints|Note:|Notes:|Explanation|Sample Input|Sample Output):?/gim, '<h4 style="margin:16px 0 8px;font-size:13.5px;color:var(--text-primary);font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">$1</h4>');

  // 4. Markdown images: allow only explicit HTTP(S), not data/javascript URLs.
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, rawUrl) => {
    const url = safeUrl(rawUrl);
    return url ? `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:10px 0;display:block;" />` : alt;
  });

  // 5. Headings
  out = out
    .replace(/^####\s+(.*$)/gim, '<h5 style="margin:14px 0 6px;font-size:14px;color:var(--text-primary);font-weight:700;">$1</h5>')
    .replace(/^###\s+(.*$)/gim, '<h4 style="margin:16px 0 8px;font-size:15px;color:var(--text-primary);font-weight:700;">$1</h4>')
    .replace(/^##\s+(.*$)/gim, '<h3 style="margin:18px 0 10px;font-size:16px;color:var(--text-primary);font-weight:800;">$1</h3>');

  // 6. Bold & Italics
  out = out
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="color:var(--text-primary);font-weight:800;"><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:700;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:var(--text-primary);font-style:italic;">$1</em>');

  // 7. Inline code
  out = out.replace(/`([^`\n]+)`/g, '<code style="background:rgba(125,125,125,0.12);padding:2px 6px;border-radius:5px;color:#0284c7;font-family:\'JetBrains Mono\',Consolas,monospace;font-size:12.5px;font-weight:600;">$1</code>');

  // 8. Links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, rawUrl) => {
    const url = safeUrl(rawUrl);
    return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;">${label}</a>` : label;
  });

  // 9. Blockquotes
  out = out.replace(/^>\s+(.*$)/gim, '<blockquote style="border-left:3px solid #6366f1;padding:8px 14px;margin:10px 0;background:rgba(99,102,241,0.08);border-radius:0 8px 8px 0;color:var(--text-primary);font-size:13.5px;">$1</blockquote>');

  // 10. Tables
  const lines = out.split('\n');
  const processed = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) continue;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      inTable = true;
    } else {
      if (inTable && tableRows.length > 0) {
        let tableHtml = '<div style="overflow-x:auto;margin:12px 0;"><table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--border);">';
        tableRows.forEach((row, rIdx) => {
          tableHtml += `<tr style="background:${rIdx === 0 ? 'rgba(125,125,125,0.08)' : 'transparent'};border-bottom:1px solid var(--border);">`;
          row.forEach(cell => {
            const tag = rIdx === 0 ? 'th' : 'td';
            tableHtml += `<${tag} style="padding:8px 12px;text-align:left;border-right:1px solid var(--border);color:var(--text-primary);font-weight:${rIdx === 0 ? '700' : '400'};">${cell}</${tag}>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        processed.push(tableHtml);
        tableRows = [];
        inTable = false;
      }
      processed.push(line);
    }
  }

  if (inTable && tableRows.length > 0) {
    let tableHtml = '<div style="overflow-x:auto;margin:12px 0;"><table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--border);">';
    tableRows.forEach((row, rIdx) => {
      tableHtml += `<tr style="background:${rIdx === 0 ? 'rgba(125,125,125,0.08)' : 'transparent'};border-bottom:1px solid var(--border);">`;
      row.forEach(cell => {
        const tag = rIdx === 0 ? 'th' : 'td';
        tableHtml += `<${tag} style="padding:8px 12px;text-align:left;border-right:1px solid var(--border);color:var(--text-primary);font-weight:${rIdx === 0 ? '700' : '400'};">${cell}</${tag}>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</table></div>';
    processed.push(tableHtml);
  }

  out = processed.join('\n');

  // 11. Convert list items
  out = out.replace(/^[•\-*]\s+(.*$)/gim, '<div style="display:flex;gap:8px;margin-bottom:6px;align-items:baseline;"><span style="color:#6366f1;font-weight:700;font-size:14px;">•</span><div style="flex:1;color:var(--text-primary);line-height:1.65;font-size:13.5px;">$1</div></div>');

  // 12. Convert double newlines to paragraph spacing
  out = out.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<table') || trimmed.startsWith('<pre')) {
      return trimmed;
    }
    return `<p style="margin:0 0 12px;line-height:1.75;color:var(--text-primary);font-size:14px;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return out;
}


// ── Pill filter button ─────────────────────────────────────────────────────
const Pill = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", background:active?`${color}18`:'var(--bg-card-high)', border:`1px solid ${active?color+'44':'var(--border)'}`, color:active?color:'#64748b', transition:'all .2s' }}>
    {label}
  </button>
);

// ── Company Tag Badge ──────────────────────────────────────────────────────
const CompanyTag = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:10, fontWeight:800, background:'linear-gradient(135deg,rgba(22,163,74,0.18),rgba(79,70,229,0.12))', color:C.green, border:'1px solid rgba(22,163,74,0.35)', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
    <Building2 size={9}/> COMPANY PROVIDED
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MockOA() {
  const [screen,      setScreen]      = useState('list');
  const [activeType,  setActiveType]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [test,        setTest]        = useState(null);
  const [questions,   setQuestions]   = useState([]);
  const [answers,     setAnswers]     = useState({});
  const [current,     setCurrent]     = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [attemptLocked, setAttemptLocked] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const submittedPayloadRef = useRef(null);
  const [flagged,     setFlagged]     = useState(new Set());
  const [submittedQuestions, setSubmittedQuestions] = useState(new Set());
  const [codeLangs,     setCodeLangs]     = useState({});
  const [customInputs,  setCustomInputs]  = useState({});
  const [showStdinMap,  setShowStdinMap]  = useState({});
  const [runOutputs,    setRunOutputs]    = useState({});
  const [runningCode,   setRunningCode]   = useState(false);
  const [activeTcTab,   setActiveTcTab]   = useState(0);

  // Proctoring: violations accumulate here for the whole attempt.
  const proctorRef = useRef([]);
  const [violationCount, setViolationCount] = useState(0);

  // Split Workspace & Palette Layout sizing controls
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [leftWidthPercent, setLeftWidthPercent] = useState(46); // Default 46% question, 54% code
  const splitContainerRef = useRef(null);
  const isDraggingSplitRef = useRef(false);

  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    isDraggingSplitRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingSplitRef.current) return;
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 28 && newWidth <= 68) {
        setLeftWidthPercent(Math.round(newWidth));
      }
    };

    const onMouseUp = () => {
      isDraggingSplitRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // DB-fetched company-uploaded tests
  const [dbTests,     setDbTests]     = useState([]);
  const [dbLoading,   setDbLoading]   = useState(true);
  const [dbError,     setDbError]     = useState('');
  const [refreshKey,  setRefreshKey]  = useState(0);

  const timerRef = useRef(null);
  const startRef = useRef(null);
  const submitRef = useRef(null);
  const submittingRef = useRef(false);

  // ── Code execution & submission helpers ─────────────────────────────────
  const getLang = useCallback((qId) => codeLangs[qId] || 'python3', [codeLangs]);

  const handleLangChange = (qId, newLang) => {
    setCodeLangs(prev => ({ ...prev, [qId]: newLang }));
    const currentCode = answers[qId] || '';
    const isOldBoilerplate = Object.values(STARTER_BOILERPLATES).some(b => b.trim() === currentCode.trim());
    if (!currentCode.trim() || isOldBoilerplate) {
      setAnswers(prev => ({ ...prev, [qId]: STARTER_BOILERPLATES[newLang] || '' }));
    }
  };

  const handleResetCode = (qId) => {
    const qObj = questions.find(x => x.id === qId);
    const lang = getLang(qId);
    const template = qObj?.starterCode || STARTER_BOILERPLATES[lang] || '';
    setAnswers(prev => ({ ...prev, [qId]: template }));
    setRunOutputs(prev => ({ ...prev, [qId]: null }));
    toast.success('Code editor reset to starter template');
  };

  const handleCodeKeyDown = (e, qId) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '    ' + val.substring(end);
      setAnswers(a => ({ ...a, [qId]: newVal }));
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRunCode = async (qId) => {
    const lang = getLang(qId);
    const currentQ = questions.find(x => x.id === qId);
    const code = answers[qId] !== undefined ? answers[qId] : (currentQ?.starterCode || STARTER_BOILERPLATES[lang] || '');
    if (!code || !code.trim()) {
      toast.error('Please write some code before executing!');
      return;
    }
    const stdin = customInputs[qId] || '';
    const isOpenStdin = !!showStdinMap[qId];
    const testCases = currentQ?.test_cases || [];

    setRunningCode(true);
    setActiveTcTab(0);
    setRunOutputs(prev => ({ ...prev, [qId]: { loading: true } }));

    try {
      let res;
      if ((isOpenStdin && stdin.trim()) || testCases.length === 0) {
        res = await api.post('/api/code/run', {
          code,
          language: lang,
          stdin,
        });
      } else {
        // Run only the published sample. This is practice feedback, never
        // proof that the private grading cases passed.
        res = await api.post('/api/code/run-tests', {
          code,
          language: lang,
          testCases,
        });
      }
      const data = res.data;
      setRunOutputs(prev => ({ ...prev, [qId]: data }));
      if (data.verdict === 'Accepted') {
        const passedText = data.totalCount
          ? `Public sample passed (${data.passedCount}/${data.totalCount}); private cases are graded on submission.`
          : 'Code executed. No reference cases were checked.';
        toast.success(passedText, { id: 'run-toast' });
      } else if (data.verdict === 'Wrong Answer') {
        toast.error(`Wrong Answer (${data.passedCount || 0}/${data.totalCount || testCases.length} test cases passed)`, { id: 'run-toast' });
      } else {
        toast.error(`Execution: ${data.verdict || 'Check terminal output'}`, { id: 'run-toast' });
      }
    } catch (err) {
      console.error('Run code error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Execution failed';
      setRunOutputs(prev => ({
        ...prev,
        [qId]: {
          verdict: 'Execution Failed',
          stderr: errMsg,
          stdout: '',
          time: '0s',
          memory: 'N/A',
          engine: 'SmartHire Code Engine'
        }
      }));
      toast.error(errMsg, { id: 'run-toast' });
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitAndNext = () => {
    const currentQ = questions[current];
    if (!currentQ) return;

    if (currentQ.type === 'mcq') {
      const ans = answers[currentQ.id];
      if (ans === undefined || ans === null || ans === '') {
        toast('Please select an option first (or click Next to skip)', { icon: 'ℹ️' });
        return;
      }
      setSubmittedQuestions(prev => new Set(prev).add(currentQ.id));
      toast.success(`Question ${current + 1} response submitted!`, { duration: 1500 });
    } else {
      const currentLang = getLang(currentQ.id);
      const currentCode = answers[currentQ.id] !== undefined
        ? answers[currentQ.id]
        : (currentQ.starterCode || STARTER_BOILERPLATES[currentLang] || '');

      if (isBoilerplateOrEmpty(currentCode, currentLang, currentQ.starterCode)) {
        toast.error('You have not written any code yet. Please implement your solution before submitting, or click Next to skip.', { duration: 3200 });
        return;
      }

      setAnswers(prev => ({ ...prev, [currentQ.id]: currentCode }));
      setSubmittedQuestions(prev => new Set(prev).add(currentQ.id));
      toast.success(`Question ${current + 1} code solution submitted!`, { duration: 1500 });
    }

    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      toast('All questions submitted! Review your answers or click Submit at the top to finalize.', { icon: '🎉', duration: 3500 });
    }
  };

  const handleClearAnswer = () => {
    const currentQ = questions[current];
    if (!currentQ) return;
    setAnswers(a => {
      const next = { ...a };
      delete next[currentQ.id];
      return next;
    });
    setSubmittedQuestions(prev => {
      const next = new Set(prev);
      next.delete(currentQ.id);
      return next;
    });
    setRunOutputs(m => ({ ...m, [currentQ.id]: null }));
    toast('Answer cleared for this question');
  };

  // ── Fetch approved company-uploaded tests from API ─────────────────────
  useEffect(() => {
    let active = true;
    setDbLoading(true);
    setDbError('');
    api.get('/api/mockoa/tests')
      .then(r => {
        if (!active) return;
        if (!Array.isArray(r.data?.tests)) throw new Error('The server did not return a test list.');
        const tests = r.data.tests.map(t => ({
          id:            t.id,
          title:         t.title,
          company:       t.companies?.name || 'Company',
          companyLogo:   t.companies?.logo_url,
          type:          t.type || t.test_type || 'technical',
          duration:      t.duration || t.duration_minutes || 60,
          totalMarks:    t.total_marks ?? null,
          sections:      t.sections || [],
          questionCount: t.question_count || 0,
          source:        'company',
          attempts:      t.attempts || 0,
          bestScore:     t.bestScore ?? null,
          dbId:          t.id,
        }));
        setDbTests(tests);
      })
      .catch(err => {
        if (!active) return;
        setDbTests([]);
        setDbError(err.response?.data?.error || err.message || 'Could not load assessments.');
      })
      .finally(() => { if (active) setDbLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  // ── All tests loaded directly from Supabase ─────────────────────────
  const allTests = dbTests;

  const filtered = allTests.filter(t => {
    if (activeType !== 'all' && t.type !== activeType) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
                  !t.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const companyTestCount = dbTests.length;

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') { clearInterval(timerRef.current); return; }
    const deadline = startRef.current + (test?.duration || 60) * 60_000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        setAttemptLocked(true);
        submitRef.current?.(true);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, test?.duration]);

  // ── Proctoring: collect violations from ProctorLayer ────────────────────
  const handleViolation = useCallback((v) => {
    proctorRef.current.push(v);
    setViolationCount(proctorRef.current.length);
  }, []);

  // ── Start test (fetches the approved questions from the backend) ────────
  const startTest = async (catalogEntry) => {
    // A viewport gate is a laptop UX check, not an identity/security boundary.
    if (window.matchMedia('(max-width: 767px)').matches) {
      toast.error('Please open SmartHire on a laptop to take a Mock OA. You can browse results on your phone.');
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    let enteredFullscreen = false;
    try {
      // Browser user activation is lost after awaiting an API call. Request
      // full-screen directly from the Start click, before fetching questions.
      const el = document.documentElement;
      const requestFullscreen = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (requestFullscreen && !document.fullscreenElement) {
        try {
          await Promise.resolve(requestFullscreen.call(el));
          enteredFullscreen = true;
        } catch (_) { /* ProctorLayer provides an explicit retry button. */ }
      }

      const testId = catalogEntry.dbId || catalogEntry.id;
      const r = await api.get(`/api/mockoa/tests/${testId}`);
      const t = r.data?.test;
      if (!t || !Array.isArray(r.data?.questions) || !r.data.questions.length) {
        throw new Error('The assessment is unavailable or has no questions.');
      }
      const qs = r.data.questions.map(q => ({
        id:            q.id,
        section:       q.section || 'General',
        type:          q.type || q.question_type || 'text',
        text:          q.question_text,
        description:   q.description || '',
        starterCode:   q.starter_code || '',
        examples:      q.examples || '',
        constraints:   q.code_constraints || '',
        placeholder:   q.placeholder || '',
        opts:          q.options || [],
        marks:         q.marks || 25,
        // Only public examples are available until the server grades the
        // saved attempt. Neither answer keys nor private cases are fetched.
        test_cases: q.sample_output == null ? [] : [{ input: q.sample_input || '', expected_output: q.sample_output }],
      }));
      const duration = Number(t.duration || t.duration_minutes || 60);
      if (!Number.isFinite(duration) || duration < 1) throw new Error('Invalid assessment duration.');
      const testObj = {
        id:          t.id,
        title:       t.title,
        company:     t.companies?.name || catalogEntry.company,
        type:        t.type || t.test_type || 'technical',
        duration,
        totalMarks:  t.total_marks || qs.reduce((s,q) => s + q.marks, 0),
        sections:    [...new Set(qs.map(q => q.section))],
        source:      'company',
      };
      setTest(testObj);
      setQuestions(qs);
      setAnswers({});
      setFlagged(new Set());
      setSubmittedQuestions(new Set());
      setCodeLangs({});
      setCustomInputs({});
      setShowStdinMap({});
      setRunOutputs({});
      setRunningCode(false);
      setCurrent(0);
      setTimeLeft(duration * 60);
      setAttemptLocked(false);
      setSubmissionError('');
      submittedPayloadRef.current = null;
      proctorRef.current = [];
      setViolationCount(0);
      startRef.current = Date.now();
      toast('Proctored exam — camera & full-screen are required. Stay on this tab.', { icon:'🎥', duration:3500 });
      setScreen('test');
    } catch (err) {
      if (enteredFullscreen && document.fullscreenElement) Promise.resolve(document.exitFullscreen?.()).catch(() => {});
      toast.error(err.response?.data?.error || err.message || 'Could not load assessment. Please try again.');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (auto) setAttemptLocked(true);
    if (submittingRef.current || !test) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionError('');

    try {
      // When the timer expires or proctoring terminates, retries must resend
      // the identical frozen answers; a manual failure before expiry can be
      // corrected while the clock keeps running.
      let snapshot = attemptLocked ? submittedPayloadRef.current : null;
      if (!snapshot) {
        const violations = proctorRef.current.slice();
        const integrityScore = computeIntegrity(violations);
        const terminated = violations.filter(v => v.type === 'tab_switch' || v.type === 'fullscreen_exit').length >= 3;
        const violationSummary = violations.reduce((acc, v) => { acc[v.type] = (acc[v.type] || 0) + 1; return acc; }, {});
        const answerMap = {};
        Object.entries(answers).forEach(([qid, val]) => {
          const qObj = questions.find(x => x.id === qid);
          const lang = getLang(qid);
          if (qObj && qObj.type !== 'mcq' && (!val || isBoilerplateOrEmpty(val, lang, qObj.starterCode))) return;
          answerMap[qid] = val;
        });
        snapshot = {
          body: {
            testId: test.id,
            answers: answerMap,
            codeLangs: { ...codeLangs },
            startedAt: new Date(startRef.current).toISOString(),
            proctoring: { violations, integrityScore, terminated },
          },
          integrityScore, violationCount: violations.length, terminated, violationSummary,
          capturedAt: Date.now(), autoSubmitted: auto || attemptLocked,
        };
        submittedPayloadRef.current = snapshot;
      }

      const r = await api.post('/api/mockoa/submit', snapshot.body);
      const d = r.data;
      if (!d?.attemptId || typeof d.score !== 'number' || typeof d.totalPossible !== 'number'
        || typeof d.percentage !== 'number' || !d.scoredAnswers) {
        throw new Error('Submission was not confirmed by the server. Check history before retrying.');
      }
      // Build result shape exclusively from the confirmed server grade.
      const breakdown = {};
      questions.forEach(q => {
        const sec = q.section || 'General';
        if (!breakdown[sec]) breakdown[sec] = { correct:0, wrong:0, total:0, marks:0, earned:0 };
        breakdown[sec].total++;
        breakdown[sec].marks += q.marks || 25;
        const scored = d.scoredAnswers[q.id];
        if (scored?.result === 'correct' || scored?.result === 'answered') {
          breakdown[sec].correct++;
          breakdown[sec].earned += scored.points || 0;
        } else if (scored?.result === 'partial') {
          breakdown[sec].wrong++;
          breakdown[sec].earned += scored.points || 0;
        } else if (scored?.result === 'wrong') {
          breakdown[sec].wrong++;
        }
      });
      setResult({
        earned: d.score, total: d.totalPossible, pct: d.percentage,
        grade: d.percentage>=90?'A+':d.percentage>=80?'A':d.percentage>=70?'B+':d.percentage>=60?'B':d.percentage>=50?'C':d.percentage>=40?'D':'F',
        correct: d.correct, wrong: d.wrong, skipped: d.skipped,
        timeTaken: Math.min(test.duration * 60, Math.round((snapshot.capturedAt - startRef.current) / 1000)),
        autoSubmitted: auto || snapshot.autoSubmitted, breakdown, questions,
        scoredAnswers: d.scoredAnswers,
        integrityScore: d.integrityScore ?? snapshot.integrityScore,
        violationCount: d.violationCount ?? snapshot.violationCount,
        terminated: d.terminated ?? snapshot.terminated,
        violationSummary: d.violationSummary || snapshot.violationSummary,
      });
      clearInterval(timerRef.current);
      setScreen('result');
    } catch (err) {
      // An interrupted response may leave the server's save status unknown.
      const message = err.response?.data?.error || err.message ||
        'Submission failed; no attempt was saved on this page. Check your history before retrying if the connection dropped.';
      setSubmissionError(message);
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [test, answers, questions, codeLangs, getLang, attemptLocked]);
  submitRef.current = handleSubmit;
  const returnToTests = () => { setScreen('list'); setRefreshKey(key => key + 1); };

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const tc  = timeLeft < 120 ? C.red : timeLeft < 300 ? C.amber : C.cyan;
  const q   = questions[current];

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: LIST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'list') return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>Company Mock OA Tests</h1>
        <p style={{ margin:'6px 0 0', fontSize:13, color:C.gray }}>
          Practice authentic company Online Assessment questions loaded directly from the database.
        </p>
      </div>

      {/* Company OA banner */}
      {companyTestCount > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(22,163,74,0.1),rgba(79,70,229,0.07))', border:'1px solid rgba(22,163,74,0.25)', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Building2 size={20} color={C.green}/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
              {companyTestCount} Approved Mock OA Test{companyTestCount === 1 ? '' : 's'} Available
            </p>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>
              Browse recruiter-provided practice questions. Your results are saved and graded by the server.
            </p>
          </div>
        </div>
      )}

      {/* Search & Type filter */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 14px', flex:'1', maxWidth:360 }}>
          <Search size={14} color={C.gray}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or test name..."
            style={{ background:'none', border:'none', outline:'none', fontSize:13, color:C.white, flex:1, fontFamily:"'Sora',sans-serif" }}/>
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.gray }}><XCircle size={13}/></button>}
        </div>

        {/* Type filter */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', marginRight:4 }}>Type:</span>
          {[['all','All',C.cyan],['aptitude','Aptitude',C.cyan],['technical','Technical',C.violet],['behavioural','Behavioural',C.amber]].map(([v,l,col])=>(
            <Pill key={v} label={l} active={activeType===v} color={col} onClick={()=>setActiveType(v)}/>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {dbLoading && (
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:60, background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:12, animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      )}

      {dbError && !dbLoading && (
        <div role="alert" style={{ marginBottom:16, padding:16, border:'1px solid #dc2626', borderRadius:10, color:C.red }}>
          {dbError} <button type="button" onClick={() => setRefreshKey(key => key + 1)} style={{ color:C.cyan, background:'none', border:0, cursor:'pointer', fontWeight:700 }}>Retry</button>
        </div>
      )}

      {/* Test Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {filtered.map(t => {
          const color  = TYPE_COLOR[t.type] || C.violet;
          const Icon   = TYPE_ICON[t.type]  || Cpu;
          const isCompany = t.source === 'company';

          // Server-owned counts and raw marks; a local cache is not proof of
          // an attempt and score points must not be labelled as percentages.
          const attempted = Number(t.attempts) > 0;

          return (
            <div key={t.id}
              style={{ background:'var(--bg-card)', border:`1px solid ${isCompany ? 'rgba(22,163,74,0.25)' : color+'20'}`, borderRadius:16, padding:22, display:'flex', flexDirection:'column', gap:14, transition:'border-color .2s, transform .2s', cursor:'default', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(22,163,74,0.5)':color+'55'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(22,163,74,0.25)':color+'20'; e.currentTarget.style.transform='translateY(0)'; }}>

              {/* Subtle glow for company tests */}
              {isCompany && (
                <div style={{ position:'absolute', top:0, right:0, width:120, height:120, background:'radial-gradient(circle at top right, rgba(22,163,74,0.08), transparent 70%)', pointerEvents:'none' }}/>
              )}

              {/* Card Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <Building2 size={12} color={C.gray}/>
                    <span style={{ fontSize:11, color:C.gray }}>{t.company}</span>
                    {/* ← COMPANY PROVIDED TAG */}
                    {isCompany && <CompanyTag />}
                  </div>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.white, lineHeight:1.3 }}>{t.title}</p>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}33`, whiteSpace:'nowrap', marginLeft:8, textTransform:'capitalize' }}>
                  {t.type}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display:'flex', gap:14, fontSize:12, color:C.light }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11} color={C.gray}/>{t.duration}m</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon size={11} color={C.gray}/>{t.questionCount || '?'} Qs</span>
                {isCompany && <span style={{ display:'flex', alignItems:'center', gap:4, color:C.green, fontSize:11, fontWeight:700 }}>✓ Verified</span>}
              </div>

              {/* Sections */}
              {t.sections?.length > 0 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {t.sections.map(s => (
                    <span key={s} style={{ fontSize:10, padding:'2px 8px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:5, color:C.light }}>{s}</span>
                  ))}
                </div>
              )}

              {/* Attempt info */}
              {attempted && (
                <p style={{ margin:0, fontSize:12, color:C.green, fontWeight:700 }}>
                  ✓ {t.attempts} saved attempt{t.attempts === 1 ? '' : 's'}
                  {t.bestScore != null ? ` · Best: ${t.bestScore}${t.totalMarks != null ? `/${t.totalMarks}` : ''} points` : ''}
                </p>
              )}

              {/* CTA */}
              <button onClick={() => startTest(t)} disabled={starting}
                style={{ width:'100%', padding:'11px 0', background:attempted?`${color}15`:isCompany?`linear-gradient(135deg,${C.green},#15803d)`:color, border:`1px solid ${isCompany?C.green:color}`, borderRadius:10, fontSize:13, fontWeight:700, color:attempted?color:'#ffffff', cursor:starting?'wait':'pointer', opacity:starting?0.65:1, fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
                {starting ? 'Loading assessment…' : attempted ? <><RefreshCw size={14}/> Retake Test</> : isCompany ? <><Building2 size={14}/> Start Mock OA</> : <>Start Test →</>}
              </button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && !dbLoading && !dbError && (
        <p style={{ textAlign:'center', color:C.gray, padding:'60px 0', fontSize:14 }}>
          No tests match your filters.
        </p>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: TEST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'test') {
    const sections = [...new Set(questions.map(q => q.section))];
    const isQuestionAnswered = (pq) => {
      const a = answers[pq.id];
      if (pq.type === 'mcq') {
        return a !== undefined && a !== null && a !== '';
      }
      return !!a && !isBoilerplateOrEmpty(a, getLang(pq.id), pq.starterCode);
    };
    const answered = questions.filter(isQuestionAnswered).length;
    const isCompanyTest = test?.source === 'company';

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 500
      }}>
        <style>{`
          .no-select-pane, .no-select-pane * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }
          .no-select-pane ::selection {
            background: transparent !important;
            color: inherit !important;
          }
        `}</style>

        {/* Top bar */}
        <div style={{ background:'var(--bg-input)', borderBottom:'1px solid var(--border)', padding:'10px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, zIndex:100 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white }}>{test.title}</p>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:11, color:C.gray }}>{test.company} · {questions.length} Questions · {test.totalMarks} Marks</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background: violationCount ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', border:`1px solid ${violationCount ? 'rgba(220,38,38,0.35)' : 'rgba(22,163,74,0.3)'}` }}>
              <Eye size={13} color={violationCount ? C.red : C.green}/>
              <span style={{ fontSize:11, fontWeight:700, color: violationCount ? C.red : C.green }}>
                {violationCount ? `${violationCount} flag${violationCount!==1?'s':''}` : 'Proctored'}
              </span>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>Answered</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.green }}>{answered}/{questions.length}</p>
            </div>
            <div style={{ background:`${tc}18`, border:`1px solid ${tc}44`, borderRadius:10, padding:'8px 18px', display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={16} color={tc}/>
              <span style={{ fontSize:20, fontWeight:800, color:tc, fontFamily:'monospace' }}>{fmt(timeLeft)}</span>
            </div>
            <button onClick={() => { if(window.confirm('Submit test now?')) handleSubmit(false); }} disabled={submitting}
              style={{ padding:'9px 18px', background:C.green, border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#ffffff', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:7 }}>
              <Send size={13}/>{submitting?'Submitting...':'Submit'}
            </button>
          </div>
        </div>

        {/* Proctoring layer: fullscreen lock, tab/blur, copy-paste, camera face-presence */}
        <ProctorLayer
          active={screen === 'test' && !attemptLocked}
          onViolation={handleViolation}
          onTerminate={() => handleSubmit(true)}
          maxHardStrikes={3}
          requireCamera={true}
        />

        {attemptLocked && (
          <div role="alertdialog" aria-modal="true" aria-label="Final assessment submission"
            style={{ position:'fixed', inset:0, zIndex:2200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.9)', padding:20 }}>
            <div style={{ maxWidth:440, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:24, textAlign:'center' }}>
              <h2 style={{ color:C.white, fontSize:20, margin:'0 0 10px' }}>Assessment closed</h2>
              <p style={{ color:C.light, fontSize:13, lineHeight:1.6 }}>
                {submitting ? 'Submitting your frozen answers to the server…'
                  : submissionError || 'The timer ended or proctoring closed the attempt. Your answers are frozen.'}
              </p>
              {!submitting && (
                <button type="button" onClick={() => handleSubmit(true)}
                  style={{ padding:'10px 18px', border:0, borderRadius:8, color:'#fff', background:C.cyan, cursor:'pointer', fontWeight:700 }}>
                  Retry final submission
                </button>
              )}
              <p style={{ color:C.gray, fontSize:11 }}>If your connection dropped, check saved results before retrying; a response can be lost after the server saves.</p>
            </div>
          </div>
        )}

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Question palette (Collapsible for maximizing coding workspace) */}
          <div
            className="no-select-pane"
            onSelectStart={(e) => { e.preventDefault(); return false; }}
            onContextMenu={(e) => { e.preventDefault(); return false; }}
            style={{
              width: paletteOpen ? 210 : 44,
              background: 'var(--bg-input)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              transition: 'width 0.2s ease',
              overflow: 'hidden'
            }}
          >
            {/* Header with collapse/expand toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: paletteOpen ? 'space-between' : 'center',
              padding: paletteOpen ? '12px 14px' : '12px 0',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0
            }}>
              {paletteOpen && (
                <span style={{ fontSize:11, fontWeight:800, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  Question Palette
                </span>
              )}
              <button
                type="button"
                onClick={() => setPaletteOpen(o => !o)}
                title={paletteOpen ? "Collapse palette for more coding space" : "Expand question palette"}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 4,
                  cursor: 'pointer',
                  color: C.gray,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {paletteOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
              </button>
            </div>

            {paletteOpen ? (
              <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
                {sections.map(sec => {
                  const sqs = questions.filter(q => q.section === sec);
                  return (
                    <div key={sec} style={{ marginBottom:16 }}>
                      <p style={{ margin:'0 0 6px', fontSize:10, color:C.gray, fontWeight:600, letterSpacing:'0.05em' }}>{sec}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {sqs.map(pq => {
                          const globalIdx = questions.findIndex(x => x.id === pq.id);
                          const isAns = isQuestionAnswered(pq);
                          const isFl  = flagged.has(pq.id);
                          const isCur = globalIdx === current;
                          const bgc   = isCur ? C.cyan : isFl ? C.amber : isAns ? C.green : 'var(--bg-card-high)';
                          return (
                            <button key={pq.id} onClick={() => setCurrent(globalIdx)}
                              style={{ width:32, height:32, borderRadius:6, background:bgc, border:`1px solid ${isCur?C.cyan:isAns?C.green:isFl?C.amber:'var(--border)'}`, color:isCur||isAns||isFl?'#ffffff':C.light, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {globalIdx+1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                  {[{c:C.green,l:'Answered'},{c:C.amber,l:'Flagged'},{c:C.cyan,l:'Current'},{c:'var(--bg-card-high)',l:'Not visited'}].map(x=>(
                    <div key={x.l} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <div style={{ width:12, height:12, borderRadius:3, background:x.c }}/>
                      <span style={{ fontSize:10, color:C.gray }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:10 }}>
                <span style={{ fontSize:11, fontWeight:800, color:C.cyan }}>
                  {current + 1}/{questions.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  style={{ background:'transparent', border:'none', color:C.gray, fontSize:10, fontWeight:700, cursor:'pointer', writingMode:'vertical-rl', transform:'rotate(180deg)', padding:'8px 0', letterSpacing:'0.08em' }}
                >
                  PALETTE
                </button>
              </div>
            )}
          </div>

          {/* Main Assessment Split Workspace (Question on Left, Coding/Options on Right) */}
          <div ref={splitContainerRef} style={{ flex:1, display:'flex', minWidth:0, minHeight:0, height:'100%', overflow:'hidden' }}>
            {q && (
              <>
                {/* ── LEFT PANE: Question Description & Details ──────────── */}
                <div
                  className="no-select-pane"
                  onCopy={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.clipboardData) {
                      try {
                        e.clipboardData.clearData();
                        e.clipboardData.setData('text/plain', '');
                      } catch (_) {}
                    }
                    try { window.getSelection()?.removeAllRanges(); } catch (_) {}
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText('').catch(() => {});
                    }
                    toast.error('Copying question text is prohibited in proctored exam', { id: 'no-copy-toast', duration: 2500 });
                  }}
                  onCut={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.clipboardData) {
                      try {
                        e.clipboardData.clearData();
                        e.clipboardData.setData('text/plain', '');
                      } catch (_) {}
                    }
                    try { window.getSelection()?.removeAllRanges(); } catch (_) {}
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText('').catch(() => {});
                    }
                  }}
                  onSelectStart={(e) => { e.preventDefault(); return false; }}
                  onDragStart={(e) => { e.preventDefault(); return false; }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                  style={{
                    width: q.type === 'mcq' ? '50%' : `${leftWidthPercent}%`,
                    minWidth: q.type === 'mcq' ? 320 : 320,
                    maxWidth: q.type === 'mcq' ? undefined : '70%',
                    height: '100%',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-card)',
                    minHeight: 0,
                    overflow: 'hidden',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                >
                  {/* Q header */}
                  <div style={{
                    display:'flex',
                    justifyContent:'space-between',
                    alignItems:'center',
                    padding:'12px 20px',
                    borderBottom:'1px solid var(--border)',
                    background:'var(--bg-input)',
                    flexShrink:0
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <span style={{ background:'var(--bg-card-high)', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:700, color:C.white }}>
                        Q {current+1} of {questions.length}
                      </span>
                      <span style={{ background:`${TYPE_COLOR[test.type]||C.violet}18`, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, color:TYPE_COLOR[test.type]||C.violet, textTransform:'capitalize' }}>
                        {q.type === 'mcq' ? 'MCQ' : 'Coding & Technical'}
                      </span>
                      <span style={{ fontSize:11, color:C.gray }}>{q.section}</span>
                      <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>[{q.marks} marks]</span>
                      {isCompanyTest && <CompanyTag />}
                    </div>
                    <button
                      onClick={() => setFlagged(f => { const n = new Set(f); n.has(q.id)?n.delete(q.id):n.add(q.id); return n; })}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', background:flagged.has(q.id)?`${C.amber}18`:'transparent', border:`1px solid ${flagged.has(q.id)?C.amber:'var(--border)'}`, borderRadius:8, color:flagged.has(q.id)?C.amber:C.gray, fontSize:12, cursor:'pointer' }}
                    >
                      <Flag size={12}/>{flagged.has(q.id)?'Flagged':'Flag'}
                    </button>
                  </div>

                  {/* Scrollable Problem Statement & Details */}
                  <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 32px' }}>
                    {/* Problem Title */}
                    <h2 style={{ margin:'0 0 16px', fontSize:19, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif", lineHeight:1.4 }}>
                      {q.text}
                    </h2>

                    {/* Rich Formatted Description */}
                    {q.description && (
                      <div
                        style={{
                          fontSize:14,
                          color:'var(--text-primary)',
                          lineHeight:1.75,
                          fontFamily:"'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          background:'var(--bg-input)',
                          padding:20,
                          borderRadius:12,
                          border:'1px solid var(--border)',
                          marginBottom:16
                        }}
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(q.description) }}
                      />
                    )}

                    {/* Examples Card */}
                    {q.examples && (
                      <div style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:C.cyan, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                            Examples / Specifications
                          </span>
                        </div>
                        <pre style={{ margin:0, fontSize:13, color:'var(--text-primary)', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", background:'var(--bg-base)', padding:12, borderRadius:8, border:'1px solid var(--border)', lineHeight:1.55 }}>
                          {q.examples}
                        </pre>
                      </div>
                    )}

                    {/* Sample Test Cases Card */}
                    {q.type !== 'mcq' && q.test_cases && q.test_cases.length > 0 && (
                      <div style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:C.cyan, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                            Public Sample ({q.test_cases.length})
                          </span>
                          <span style={{ fontSize:10, color:C.gray }}>Private grading cases are never shown</span>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {q.test_cases.slice(0, 3).map((tc, tcIdx) => (
                            <div key={tcIdx} style={{ background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:C.amber, marginBottom:6 }}>Case {tcIdx + 1}</div>
                              {tc.input ? (
                                <div style={{ marginBottom:6 }}>
                                  <div style={{ fontSize:10, color:C.gray, marginBottom:2 }}>Input:</div>
                                  <pre style={{ margin:0, fontSize:12, color:'var(--text-primary)', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", background:'var(--bg-card-high)', padding:'4px 8px', borderRadius:4, whiteSpace:'pre-wrap' }}>{tc.input}</pre>
                                </div>
                              ) : null}
                              <div>
                                <div style={{ fontSize:10, color:C.gray, marginBottom:2 }}>Expected Output:</div>
                                <pre style={{ margin:0, fontSize:12, color:'#4ade80', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", background:'var(--bg-card-high)', padding:'4px 8px', borderRadius:4, whiteSpace:'pre-wrap' }}>{tc.expected_output}</pre>
                              </div>
                            </div>
                          ))}

                        </div>
                      </div>
                    )}

                    {/* Constraints Card */}
                    {q.constraints && (
                      <div style={{ background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.25)', borderRadius:10, padding:14 }}>
                        <div style={{ fontSize:11, fontWeight:800, color:C.amber, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>
                          Constraints
                        </div>
                        <p style={{ margin:0, fontSize:13, color:'var(--text-primary)', lineHeight:1.6, fontWeight:500 }}>
                          {q.constraints}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Draggable Divider between Question & Code */}
                {q.type !== 'mcq' && (
                  <div
                    onMouseDown={handleDividerMouseDown}
                    style={{
                      width: 6,
                      height: '100%',
                      cursor: 'col-resize',
                      background: 'var(--border)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s',
                      userSelect: 'none',
                      zIndex: 10
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--border)'}
                    title="Drag to resize Question and Code panes"
                  >
                    <div style={{ width: 2, height: 28, borderRadius: 1, background: 'rgba(255,255,255,0.35)' }} />
                  </div>
                )}

                {/* ── RIGHT PANE: Coding Workspace / MCQ Options ───────────── */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  height: '100%',
                  minHeight: 0,
                  overflow: 'hidden',
                  background: 'var(--bg-base)'
                }}>
                  {/* When Coding Question */}
                  {q.type !== 'mcq' && (() => {
                    const currentLang = getLang(q.id);
                    const currentCode = answers[q.id] !== undefined ? answers[q.id] : (q.starterCode || STARTER_BOILERPLATES[currentLang] || '');
                    const currentStdin = customInputs[q.id] || '';
                    const out = runOutputs[q.id];
                    const isOpenStdin = !!showStdinMap[q.id];
                    const lineCount = (currentCode || '').split('\n').length;
                    const charCount = (currentCode || '').length;

                    return (
                      <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
                        {/* Right Pane Topbar: Language selector & Actions */}
                        <div style={{
                          display:'flex',
                          justifyContent:'space-between',
                          alignItems:'center',
                          flexWrap:'wrap',
                          gap:8,
                          padding:'10px 16px',
                          background:'var(--bg-input)',
                          borderBottom:'1px solid var(--border)',
                          flexShrink:0
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <Code2 size={15} color={C.cyan} />
                              <span style={{ fontSize:12, fontWeight:700, color:C.white }}>Language:</span>
                            </div>
                            <select
                              value={currentLang}
                              onChange={(e) => handleLangChange(q.id, e.target.value)}
                              style={{ background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, color:C.white, outline:'none', cursor:'pointer' }}
                            >
                              {CODE_LANGUAGES.map(l => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleResetCode(q.id)}
                              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, color:C.gray, fontSize:11, cursor:'pointer' }}
                              title="Reset code to starter template"
                            >
                              <RotateCcw size={11} /> Reset
                            </button>

                            {/* Width Presets */}
                            <div style={{ display:'flex', alignItems:'center', gap:3, background:'var(--bg-card-high)', padding:'3px 4px', borderRadius:8, border:'1px solid var(--border)' }}>
                              <span style={{ fontSize:10.5, fontWeight:700, color:C.gray, paddingLeft:4, paddingRight:2 }}>Split:</span>
                              {[
                                { label: '46% Q', pct: 46, title: 'Comfortable Question (46% Question / 54% Code)' },
                                { label: '38% Q', pct: 38, title: 'Wider Code (38% Question / 62% Code)' },
                                { label: '30% Q', pct: 30, title: 'Max Code (30% Question / 70% Code)' }
                              ].map(s => (
                                <button
                                  key={s.pct}
                                  type="button"
                                  onClick={() => setLeftWidthPercent(s.pct)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background: leftWidthPercent === s.pct ? '#4f46e5' : 'transparent',
                                    color: leftWidthPercent === s.pct ? '#ffffff' : 'var(--text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                  title={s.title}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <button
                              type="button"
                              onClick={() => setShowStdinMap(s => ({ ...s, [q.id]: !s[q.id] }))}
                              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:isOpenStdin ? `${C.amber}1a` : 'transparent', border:`1px solid ${isOpenStdin ? C.amber : 'var(--border)'}`, borderRadius:8, color:isOpenStdin ? C.amber : C.light, fontSize:12, cursor:'pointer' }}
                            >
                              <Terminal size={12} /> {isOpenStdin ? 'Hide stdin' : 'Custom Input (stdin)'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRunCode(q.id)}
                              disabled={runningCode}
                              style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 18px', background:runningCode ? C.gray : 'linear-gradient(135deg, #4f46e5, #4338ca)', border:'none', borderRadius:8, color:'#ffffff', fontSize:12, fontWeight:700, cursor:runningCode ? 'not-allowed' : 'pointer', boxShadow:'0 2px 8px rgba(79,70,229,0.3)', transition:'all .2s' }}
                            >
                              {runningCode ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" /> Running on JDoodle...
                                </>
                              ) : (
                                <>
                                  <Play size={12} fill="#ffffff" /> Run Code
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Editor Container (Fills available height) */}
                        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, position:'relative', background:'#090d16', overflow:'hidden' }}>
                          <textarea
                            value={currentCode}
                            onChange={(e) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            onKeyDown={(e) => handleCodeKeyDown(e, q.id)}
                            placeholder={q.placeholder || '// Write your solution code here...\n// Standard input can be read if provided in Custom Input.'}
                            spellCheck={false}
                            style={{
                              flex:1,
                              width:'100%',
                              height:'100%',
                              background:'transparent',
                              border:'none',
                              padding:'18px 20px',
                              fontSize:14.5,
                              color:'#f8fafc',
                              resize:'none',
                              outline:'none',
                              lineHeight:1.75,
                              fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace",
                              boxSizing:'border-box',
                              tabSize:4,
                              overflowY:'auto'
                            }}
                          />

                          {/* Editor status footer */}
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 16px', background:'#0f172a', borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'#64748b', flexShrink:0 }}>
                            <span>Lines: {lineCount} | Chars: {charCount} | Tab = 4 spaces</span>
                            <span style={{ display:'flex', alignItems:'center', gap:5, color:'#38bdf8' }}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8', display:'inline-block' }} />
                              JDoodle Cloud Execution Engine
                            </span>
                          </div>
                        </div>

                        {/* Optional Custom Input Drawer */}
                        {isOpenStdin && (
                          <div style={{ background:'var(--bg-input)', borderTop:'1px solid var(--border)', padding:12, flexShrink:0 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:C.light }}>Standard Input (stdin):</span>
                              <span style={{ fontSize:10, color:C.gray }}>Passed to program during execution</span>
                            </div>
                            <textarea
                              value={currentStdin}
                              onChange={(e) => setCustomInputs(m => ({ ...m, [q.id]: e.target.value }))}
                              placeholder="Enter any input lines your program expects..."
                              rows={3}
                              style={{ width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:8, fontSize:12, color:C.white, resize:'vertical', outline:'none', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", boxSizing:'border-box' }}
                            />
                          </div>
                        )}

                        {/* Execution Output Console */}
                        {out && (
                          <div style={{ background:'#090d16', borderTop:'1px solid #1e293b', padding:14, flexShrink:0, maxHeight:240, overflowY:'auto' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:8, borderBottom:'1px solid #1e293b', paddingBottom:6 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <Terminal size={14} color="#38bdf8" />
                                <span style={{ fontSize:12, fontWeight:700, color:'#f8fafc' }}>Execution Console</span>

                                {!out.loading && out.verdict && (
                                  <span style={{
                                    fontSize:11,
                                    fontWeight:700,
                                    padding:'2px 8px',
                                    borderRadius:6,
                                    background: out.verdict === 'Accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: out.verdict === 'Accepted' ? '#4ade80' : '#f87171',
                                    border: `1px solid ${out.verdict === 'Accepted' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                                  }}>
                                    {out.verdict === 'Accepted' ? `✓ Accepted (${out.passedCount || 0}/${out.totalCount || 0} passed)` :
                                     out.verdict === 'Wrong Answer' ? `✗ Wrong Answer (${out.passedCount || 0}/${out.totalCount || 0} passed)` :
                                     out.verdict}
                                  </span>
                                )}
                              </div>

                              <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'#64748b' }}>
                                {!out.loading && out.time && <span>⏱ {out.time}</span>}
                                {!out.loading && out.memory && out.memory !== 'N/A' && <span>💾 {out.memory}</span>}
                                {!out.loading && out.engine && <span style={{ color:'#818cf8' }}>☁ {out.engine}</span>}

                                {!out.loading && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const text = out.results && out.results.length > 0
                                        ? out.results.map(r => `Case ${r.testCase} (${r.verdict}):\nInput: ${r.input || '(none)'}\nExpected: ${r.expected || '(none)'}\nActual: ${r.actual || '(none)'}`).join('\n\n')
                                        : [out.stdout, out.stderr].filter(Boolean).join('\n');
                                      try {
                                        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
                                        await navigator.clipboard.writeText(text);
                                        toast.success('Console output copied!');
                                      } catch {
                                        toast.error('Clipboard access is unavailable in this browser.');
                                      }
                                    }}
                                    style={{ display:'flex', alignItems:'center', gap:4, background:'transparent', border:'1px solid #334155', borderRadius:6, padding:'2px 7px', color:'#94a3b8', fontSize:10, cursor:'pointer' }}
                                  >
                                    <Copy size={10} /> Copy
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setRunOutputs(m => ({ ...m, [q.id]: null }))}
                                  style={{ background:'transparent', border:'none', color:'#64748b', fontSize:11, cursor:'pointer' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {out.loading ? (
                              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 4px', color:'#38bdf8' }}>
                                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize:12, fontWeight:600 }}>Executing code against question test cases on JDoodle Cloud...</span>
                              </div>
                            ) : out.results && Array.isArray(out.results) && out.results.length > 0 ? (
                              <div>
                                {/* Test Case Selector Tabs */}
                                <div style={{ display:'flex', gap:6, marginBottom:10, overflowX:'auto', paddingBottom:2 }}>
                                  {out.results.map((r, rIdx) => {
                                    const isSel = activeTcTab === rIdx;
                                    const isPass = r.passed;
                                    return (
                                      <button
                                        key={rIdx}
                                        type="button"
                                        onClick={() => setActiveTcTab(rIdx)}
                                        style={{
                                          padding:'4px 10px',
                                          borderRadius:6,
                                          fontSize:11,
                                          fontWeight:700,
                                          cursor:'pointer',
                                          display:'flex',
                                          alignItems:'center',
                                          gap:6,
                                          background: isSel ? '#1e293b' : '#0f172a',
                                          border: `1px solid ${isSel ? (isPass ? '#22c55e' : '#ef4444') : '#334155'}`,
                                          color: isSel ? '#ffffff' : '#94a3b8',
                                          transition:'all 0.15s'
                                        }}
                                      >
                                        <span style={{
                                          width:6,
                                          height:6,
                                          borderRadius:'50%',
                                          background: isPass ? '#22c55e' : '#ef4444',
                                          display:'inline-block'
                                        }} />
                                        Case {rIdx + 1}
                                        <span style={{ fontSize:10, color: isPass ? '#4ade80' : '#f87171' }}>
                                          {isPass ? 'Passed' : 'Failed'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Active Test Case Details */}
                                {(() => {
                                  const curResult = out.results[activeTcTab] || out.results[0];
                                  if (!curResult) return null;
                                  return (
                                    <div style={{ background:'#020617', border:'1px solid #1e293b', borderRadius:8, padding:10, fontSize:12 }}>
                                      {curResult.input ? (
                                        <div style={{ marginBottom:8 }}>
                                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:2 }}>Input:</div>
                                          <pre style={{ margin:0, padding:'6px 8px', background:'#090d16', borderRadius:6, color:'#f1f5f9', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', monospace" }}>{curResult.input}</pre>
                                        </div>
                                      ) : null}
                                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: curResult.stderr ? 8 : 0 }}>
                                        <div>
                                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:2 }}>Expected Output:</div>
                                          <pre style={{ margin:0, padding:'6px 8px', background:'#090d16', borderRadius:6, color:'#4ade80', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', monospace" }}>{curResult.expected || '(None)'}</pre>
                                        </div>
                                        <div>
                                          <div style={{ fontSize:10, fontWeight:700, color: curResult.passed ? '#4ade80' : '#f87171', marginBottom:2 }}>Your Output:</div>
                                          <pre style={{ margin:0, padding:'6px 8px', background:'#090d16', borderRadius:6, color: curResult.passed ? '#4ade80' : '#f87171', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', monospace" }}>{curResult.actual || '(No output)'}</pre>
                                        </div>
                                      </div>
                                      {curResult.stderr && (
                                        <div style={{ marginTop:8 }}>
                                          <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:2 }}>Error / Stderr:</div>
                                          <pre style={{ margin:0, padding:'6px 8px', background:'#090d16', borderRadius:6, color:'#f87171', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', monospace" }}>{curResult.stderr}</pre>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div>
                                {/* Single Stderr / Stdout Display (fallback or custom stdin) */}
                                {out.stdout && (
                                  <div style={{ marginBottom: out.stderr ? 10 : 0 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:4 }}>Standard Output:</div>
                                    <pre style={{ margin:0, padding:10, background:'#020617', borderRadius:8, fontSize:12, color:'#4ade80', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", maxHeight:120, overflowY:'auto' }}>
                                      {out.stdout}
                                    </pre>
                                  </div>
                                )}

                                {out.stderr && (
                                  <div>
                                    <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:4 }}>Compiler / Error Output:</div>
                                    <pre style={{ margin:0, padding:10, background:'#020617', borderRadius:8, fontSize:12, color:'#f87171', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", maxHeight:120, overflowY:'auto' }}>
                                      {out.stderr}
                                    </pre>
                                  </div>
                                )}

                                {!out.stdout && !out.stderr && (
                                  <p style={{ margin:0, fontSize:12, color:'#64748b', fontStyle:'italic' }}>
                                    Program executed cleanly with no output.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Navigation & Submit Bar */}
                        <div style={{
                          display:'flex',
                          justifyContent:'space-between',
                          alignItems:'center',
                          padding:'12px 20px',
                          background:'var(--bg-input)',
                          borderTop:'1px solid var(--border)',
                          flexShrink:0
                        }}>
                          <div style={{ display:'flex', gap:10 }}>
                            <button
                              onClick={() => setCurrent(c => Math.max(0, c - 1))}
                              disabled={current === 0}
                              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:current === 0 ? C.gray : C.white, fontSize:13, cursor:current === 0 ? 'not-allowed' : 'pointer', fontFamily:"'Sora',sans-serif" }}
                            >
                              <ChevronLeft size={16}/> Previous
                            </button>
                            <button
                              onClick={handleClearAnswer}
                              style={{ padding:'9px 14px', background:'transparent', border:`1px solid ${C.red}33`, borderRadius:9, color:C.red, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}
                            >
                              Clear
                            </button>
                          </div>

                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            {/* Submit & Next Button */}
                            <button
                              onClick={handleSubmitAndNext}
                              style={{
                                display:'flex',
                                alignItems:'center',
                                gap:8,
                                padding:'10px 22px',
                                background:'linear-gradient(135deg, #16a34a, #15803d)',
                                border:'none',
                                borderRadius:9,
                                color:'#ffffff',
                                fontSize:13,
                                fontWeight:700,
                                cursor:'pointer',
                                fontFamily:"'Sora',sans-serif",
                                boxShadow:'0 2px 10px rgba(22,163,74,0.3)',
                                transition:'all .15s'
                              }}
                            >
                              <Check size={16}/> {current === questions.length - 1 ? 'Submit & Review' : 'Submit & Next'}
                            </button>

                            {/* Skip / Next Button */}
                            <button
                              onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                              disabled={current === questions.length - 1}
                              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:9, color:current === questions.length - 1 ? C.gray : C.white, fontSize:13, fontWeight:600, cursor:current === questions.length - 1 ? 'not-allowed' : 'pointer', fontFamily:"'Sora',sans-serif" }}
                            >
                              Next <ChevronRight size={15}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* When MCQ Question */}
                  {q.type === 'mcq' && (
                    <div
                      className="no-select-pane"
                      onCopy={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.clipboardData) {
                          try {
                            e.clipboardData.clearData();
                            e.clipboardData.setData('text/plain', '');
                          } catch (_) {}
                        }
                        try { window.getSelection()?.removeAllRanges(); } catch (_) {}
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText('').catch(() => {});
                        }
                        toast.error('Copying is prohibited in proctored exam', { id: 'no-copy-toast', duration: 2500 });
                      }}
                      onCut={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.clipboardData) {
                          try {
                            e.clipboardData.clearData();
                            e.clipboardData.setData('text/plain', '');
                          } catch (_) {}
                        }
                        try { window.getSelection()?.removeAllRanges(); } catch (_) {}
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText('').catch(() => {});
                        }
                      }}
                      onSelectStart={(e) => { e.preventDefault(); return false; }}
                      onDragStart={(e) => { e.preventDefault(); return false; }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
                      style={{
                        display:'flex',
                        flexDirection:'column',
                        flex:1,
                        minHeight:0,
                        overflow:'hidden',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                    >
                      <div style={{ flex:1, overflowY:'auto', padding:28 }}>
                        <p style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          Select Your Answer:
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                          {(q.opts || q.options || []).map((opt, i) => {
                            const sel = parseInt(answers[q.id]) === i;
                            return (
                              <button
                                key={i}
                                onClick={() => setAnswers(a => ({...a, [q.id]: i}))}
                                style={{
                                  textAlign:'left',
                                  padding:'16px 20px',
                                  background: sel ? `${C.violet}18` : 'var(--bg-card-high)',
                                  border: `1px solid ${sel ? C.violet : 'var(--border)'}`,
                                  borderRadius: 12,
                                  color: sel ? C.white : C.light,
                                  fontSize: 14,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 14,
                                  fontFamily: "'Sora',sans-serif",
                                  transition: 'all .15s'
                                }}
                              >
                                <span style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: sel ? C.violet : 'var(--bg-input)',
                                  border: `1px solid ${sel ? C.violet : 'var(--border)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: sel ? '#fff' : C.gray,
                                  flexShrink: 0
                                }}>
                                  {['A','B','C','D'][i]}
                                </span>
                                <span style={{ fontSize:14, lineHeight:1.5 }}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Navigation & Submit Bar */}
                      <div style={{
                        display:'flex',
                        justifyContent:'space-between',
                        alignItems:'center',
                        padding:'14px 24px',
                        background:'var(--bg-input)',
                        borderTop:'1px solid var(--border)',
                        flexShrink:0
                      }}>
                        <div style={{ display:'flex', gap:10 }}>
                          <button
                            onClick={() => setCurrent(c => Math.max(0, c - 1))}
                            disabled={current === 0}
                            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:current === 0 ? C.gray : C.white, fontSize:13, cursor:current === 0 ? 'not-allowed' : 'pointer', fontFamily:"'Sora',sans-serif" }}
                          >
                            <ChevronLeft size={16}/> Previous
                          </button>
                          <button
                            onClick={handleClearAnswer}
                            style={{ padding:'10px 16px', background:'transparent', border:`1px solid ${C.red}33`, borderRadius:9, color:C.red, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}
                          >
                            Clear
                          </button>
                        </div>

                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <button
                            onClick={handleSubmitAndNext}
                            style={{
                              display:'flex',
                              alignItems:'center',
                              gap:8,
                              padding:'11px 24px',
                              background:'linear-gradient(135deg, #16a34a, #15803d)',
                              border:'none',
                              borderRadius:9,
                              color:'#ffffff',
                              fontSize:13,
                              fontWeight:700,
                              cursor:'pointer',
                              fontFamily:"'Sora',sans-serif",
                              boxShadow:'0 2px 10px rgba(22,163,74,0.3)',
                              transition:'all .15s'
                            }}
                          >
                            <Check size={16}/> {current === questions.length - 1 ? 'Submit & Review' : 'Submit & Next'}
                          </button>

                          <button
                            onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                            disabled={current === questions.length - 1}
                            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:9, color:current === questions.length - 1 ? C.gray : C.white, fontSize:13, fontWeight:600, cursor:current === questions.length - 1 ? 'not-allowed' : 'pointer', fontFamily:"'Sora',sans-serif" }}
                          >
                            Next <ChevronRight size={15}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: RESULT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'result' && result) {
    const gradeColor = result.grade.startsWith('A')?C.green:result.grade==='B+'||result.grade==='B'?C.cyan:result.grade==='C'?C.amber:C.red;
    const timeTakenFmt = `${Math.floor(result.timeTaken/60)}m ${result.timeTaken%60}s`;
    const isCompanyTest = test?.source === 'company';

    const radarData = Object.entries(result.breakdown).map(([sec, b]) => ({
      subject: sec.length > 12 ? sec.substring(0,12)+'…' : sec,
      score: b.marks > 0 ? Math.round((b.earned/b.marks)*100) : 0,
      fullMark: 100,
    }));

    const barData = Object.entries(result.breakdown).map(([sec, b]) => ({
      name: sec.length > 10 ? sec.substring(0,10)+'…' : sec,
      earned: b.earned, total: b.marks,
    }));

    const CustomTooltip = ({active,payload,label}) => active&&payload?.length
      ? <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px'}}>
          <p style={{margin:0,fontSize:11,color:C.gray}}>{label}</p>
          {payload.map((p,i)=><p key={i} style={{margin:'3px 0 0',fontSize:13,fontWeight:700,color:p.color||C.cyan}}>{p.name}: {p.value}</p>)}
        </div> : null;

    return (
      <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>OA Analysis Dashboard</h1>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:13, color:C.gray }}>{test.title} · {test.company}</p>
            {result.autoSubmitted && <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>⚡ Auto-submitted (timer expired)</span>}
          </div>
          <button onClick={returnToTests}
            style={{ padding:'9px 18px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:9, color:C.white, fontSize:13, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            ← Back to Tests
          </button>
        </div>

        {/* Score cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Score',           value:`${result.earned}/${result.total}`, sub:`${result.pct}%`,             color:gradeColor },
            { label:'Grade',           value:result.grade,                       sub:'Performance',                 color:gradeColor },
            { label:'Correct / Wrong', value:`${result.correct} / ${result.wrong}`, sub:`${result.skipped} skipped`, color:C.green },
            { label:'Time Taken',      value:timeTakenFmt,                       sub:`of ${test.duration}m allowed`, color:C.cyan },
          ].map((m,i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:`1px solid ${m.color}22`, borderRadius:14, padding:20, textAlign:'center' }}>
              <p style={{ margin:0, fontSize:12, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</p>
              <p style={{ margin:'8px 0 2px', fontSize:26, fontWeight:800, color:m.color, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{m.value}</p>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Proctoring integrity panel */}
        {(() => {
          const iScore = result.integrityScore ?? 100;
          const iColor = iScore >= 85 ? C.green : iScore >= 60 ? C.amber : C.red;
          const summary = result.violationSummary || {};
          const LABELS = {
            tab_switch:'Tab switches', fullscreen_exit:'Full-screen exits', multiple_faces:'Multiple faces',
            no_face:'Face not visible', copy:'Copy attempts', cut:'Cut attempts', paste:'Paste attempts',
            context_menu:'Right-clicks', camera_blocked:'Camera blocked',
          };
          const entries = Object.entries(summary).filter(([, n]) => n > 0);
          return (
            <div style={{ background:'var(--bg-card)', border:`1px solid ${iColor}33`, borderRadius:14, padding:20, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${iColor}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Eye size={22} color={iColor}/>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:800, color:C.white }}>Proctoring Integrity</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:C.gray }}>
                      {result.terminated ? 'Exam auto-submitted due to repeated violations' :
                        (result.violationCount ? `${result.violationCount} violation${result.violationCount!==1?'s':''} recorded` : 'No violations detected — clean attempt')}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ margin:0, fontSize:28, fontWeight:800, color:iColor, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{iScore}<span style={{ fontSize:14, color:C.gray }}>/100</span></p>
                  <p style={{ margin:'2px 0 0', fontSize:10, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>Integrity Score</p>
                </div>
              </div>
              {entries.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                  {entries.map(([type, n]) => (
                    <span key={type} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:999, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', fontSize:11, fontWeight:700, color:C.red }}>
                      <AlertTriangle size={11}/> {LABELS[type] || type}: {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Marks by Section</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="earned" name="Earned" radius={[4,4,0,0]} maxBarSize={28}>
                  {barData.map((entry,i) => {
                    const pct = entry.total>0?Math.round((entry.earned/entry.total)*100):0;
                    return <Cell key={i} fill={pct>=75?C.green:pct>=50?C.amber:C.red}/>;
                  })}
                </Bar>
                <Bar dataKey="total" name="Total" fill="rgba(15,23,42,0.08)" radius={[4,4,0,0]} maxBarSize={28}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {radarData.length >= 3 ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section Radar</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(15,23,42,0.10)"/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:C.gray,fontSize:10}}/>
                  <Radar name="Score %" dataKey="score" stroke={gradeColor} fill={gradeColor} fillOpacity={0.2} strokeWidth={2}/>
                  <Tooltip content={<CustomTooltip/>}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>MCQ Breakdown</p>
              <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                {[{l:'Correct',v:result.correct,c:C.green},{l:'Wrong',v:result.wrong,c:C.red},{l:'Skipped',v:result.skipped,c:C.gray}].map(x=>(
                  <div key={x.l} style={{ flex:1, textAlign:'center', padding:14, background:`${x.c}0f`, border:`1px solid ${x.c}22`, borderRadius:10 }}>
                    <p style={{ margin:0, fontSize:24, fontWeight:800, color:x.c }}>{x.v}</p>
                    <p style={{ margin:'4px 0 0', fontSize:11, color:C.gray }}>{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section table */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:20 }}>
          <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section-wise Performance</p>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Section','Questions','Correct','Marks Earned','Total','Score %'].map(h=>(
              <th key={h} style={{ padding:'8px 12px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid var(--border)', textAlign:'left' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {Object.entries(result.breakdown).map(([sec, b]) => {
                const pct = b.marks>0?Math.round((b.earned/b.marks)*100):0;
                const col = pct>=75?C.green:pct>=50?C.amber:C.red;
                return (
                  <tr key={sec}>
                    <td style={{ padding:'12px', fontSize:13, color:C.white, borderBottom:'1px solid var(--border)', fontWeight:600 }}>{sec}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid var(--border)' }}>{b.total}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.green, borderBottom:'1px solid var(--border)', fontWeight:700 }}>{b.correct}</td>
                    <td style={{ padding:'12px', fontSize:13, color:col, borderBottom:'1px solid var(--border)', fontWeight:700 }}>{b.earned}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid var(--border)' }}>{b.marks}</td>
                    <td style={{ padding:'12px', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-card-high)', borderRadius:999 }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:999, transition:'width .6s' }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Question-by-Question Review with Solutions */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:24 }}>
          <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white, display:'flex', alignItems:'center', gap:8 }}>
            <Sparkles size={16} color={C.green}/> Server-graded answer review
          </p>
          {(result.questions || []).map((q, i) => {
            const userAns = answers[q.id];
            const isText = q.type !== 'mcq';
            const scored = result.scoredAnswers?.[q.id];
            const correctIdx = scored?.correct;
            const isSkipped = scored?.result === 'skipped';
            const isCorrect = scored?.result === 'correct' || scored?.result === 'answered';
            const isPartial = scored ? (scored.result === 'partial') : false;
            const statusColor = isSkipped ? C.gray : isCorrect ? C.green : isPartial ? C.amber : C.red;
            const statusIcon  = isSkipped ? '—' : isCorrect ? '✓' : isPartial ? '½' : '✗';
            const explanation = scored?.explanation;

            return (
              <div key={q.id} style={{ marginBottom:14, padding:16, background:`${statusColor}08`, border:`1px solid ${statusColor}20`, borderRadius:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ width:26, height:26, borderRadius:7, background:statusColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#ffffff', flexShrink:0 }}>
                    {statusIcon}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, flexWrap:'wrap', gap:8 }}>
                      <p style={{ margin:0, fontSize:13, color:C.white, lineHeight:1.5, flex:1 }}><strong>Q{i+1}.</strong> {q.text}</p>
                      <span style={{ fontSize:11, color:C.gray, whiteSpace:'nowrap' }}>{q.section} [{q.marks} marks]</span>
                    </div>

                    {isText ? (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:12, color:C.gray }}>Your Submitted Code:</span>
                          <span style={{ fontSize:11, fontWeight:700, color:statusColor }}>
                            {scored?.verdict || (isSkipped ? 'Unattempted' : isCorrect ? 'Accepted' : isPartial ? 'Partial Credit' : 'Attempted')} · {scored?.points ?? (isCorrect ? q.marks : 0)}/{q.marks} marks
                          </span>
                        </div>
                        <pre style={{ margin:'6px 0', padding:10, background:'var(--bg-card-high)', borderRadius:8, fontSize:12, color:!isSkipped && userAns ? C.white : C.gray, overflowX:'auto', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace" }}>
                          {isSkipped ? '(No code submitted — question skipped or starter template unchanged)' : (userAns || '(No response submitted)')}
                        </pre>

                        {/* Test Cases Results Breakdown */}
                        {scored?.testCaseResults && scored.testCaseResults.length > 0 && (
                          <div style={{ marginTop:10, background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:C.light }}>
                                Test Case Results: {scored.testCasesPassed || 0}/{scored.totalTestCases || scored.testCaseResults.length} Passed
                              </span>
                              <span style={{ fontSize:10, color:isCorrect ? C.green : C.amber, fontWeight:700 }}>
                                {isCorrect ? 'Passed server grading' : scored.verdict || 'Partial / Failed Test Cases'}
                              </span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                              {scored.testCaseResults.map((tc, tcIdx) => (
                                <div key={tcIdx} style={{ padding:'8px 10px', borderRadius:6, background:'var(--bg-card-high)', border:`1px solid ${tc.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                    <span style={{ fontSize:11, fontWeight:700, color:tc.passed ? C.green : C.red }}>
                                      {tc.passed ? '✓' : '✗'} Case {tc.testCase || tcIdx + 1}: {tc.verdict || (tc.passed ? 'Passed' : 'Failed')}
                                    </span>
                                  </div>
                                  {tc.expected !== undefined && tc.actual !== undefined ? (
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11 }}>
                                      <div>
                                        <span style={{ color:C.gray, fontSize:10 }}>Expected Output:</span>
                                        <pre style={{ margin:0, padding:'3px 6px', background:'#090d16', borderRadius:4, color:'#4ade80', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'pre-wrap' }}>{tc.expected || '(None)'}</pre>
                                      </div>
                                      <div>
                                        <span style={{ color:C.gray, fontSize:10 }}>Your Output:</span>
                                        <pre style={{ margin:0, padding:'3px 6px', background:'#090d16', borderRadius:4, color:tc.passed ? '#4ade80' : '#f87171', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'pre-wrap' }}>{tc.actual || '(No output)'}</pre>
                                      </div>
                                    </div>
                                  ) : <span style={{ color:C.gray, fontSize:11 }}>Private case output is not disclosed.</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Static Analysis Notice (when question has no standard test cases) */}
                        {scored?.staticAnalysis && (
                          <div style={{ marginTop:10, background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:8, padding:'10px 14px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'#38bdf8' }}>
                                Limited static-review credit (not correctness)
                              </span>
                              <span style={{ fontSize:10, color:'#94a3b8' }}>No automated I/O test cases configured</span>
                            </div>
                            <p style={{ margin:0, fontSize:12, color:'var(--text-primary)', lineHeight:1.5 }}>
                              {scored.details || 'No reference cases were available. Code execution alone does not prove a solution is correct.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:16, fontSize:12, flexWrap:'wrap', marginBottom:8 }}>
                        <span style={{ color:C.gray }}>Your answer: <strong style={{ color:isSkipped?C.gray:isCorrect?C.green:C.red }}>{isSkipped ? 'Not attempted' : (q.opts||q.options||[])[parseInt(userAns)]||'N/A'}</strong></span>
                        <span style={{ color:C.gray }}>Correct: <strong style={{ color:C.green }}>{(q.opts||q.options||[])[correctIdx] ?? 'Not available'}</strong></span>
                      </div>
                    )}

                    {explanation && (
                      <div style={{ marginTop:8, background:'var(--bg-card-high)', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)' }}>
                        <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.green }}>💡 Official Solution & Approach:</p>
                        <pre style={{ margin:0, fontSize:12, color:C.light, whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", lineHeight:1.6 }}>
                          {explanation}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => startTest(test)} disabled={starting}
            style={{ padding:'12px 28px', background:C.violet, border:'none', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', cursor:starting?'wait':'pointer', opacity:starting?0.65:1, fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
            <RefreshCw size={15}/> {starting ? 'Loading assessment…' : 'Retake Test'}
          </button>
          <button onClick={returnToTests}
            style={{ padding:'12px 28px', background:'transparent', border:'1px solid var(--border)', borderRadius:10, fontSize:14, fontWeight:700, color:C.white, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            All Tests
          </button>
        </div>
      </div>
    );
  }

  return null;
}