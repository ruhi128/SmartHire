// src/pages/student/MockInterview.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { interviewAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import {
  Video, Mic, Play, User, Brain,
  CheckCircle, Clock, Loader2, MicOff, AlertCircle,
  Volume2, VolumeX, Sparkles, Award, BarChart2, RefreshCw,
  ArrowRight, Edit3, Eye, ChevronDown, ChevronUp,
  History, Copy, Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { loadFaceApi } from '../../utils/loadFaceApi';

const FACE_MODEL_URL = `${process.env.PUBLIC_URL || ''}/models`;
const CYAN   = '#4f46e5',
      GREEN  = '#16a34a',
      AMBER  = '#d97706',
      RED    = '#dc2626',
      VIOLET = '#7c3aed',
      BLUE   = '#2563eb',
      TEAL   = '#0d9488';

// ═══════════════════════════════════════════════════════════════════════════
//  INTERVIEW TRACKS & QUESTIONS REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════
export const INTERVIEW_TRACKS = [
  {
    id: 'hr_behavioral',
    title: 'Behavioral & HR (STAR Method)',
    description: 'Culture fit, teamwork, leadership, conflict resolution, and career motivation.',
    icon: '🌟',
    badge: 'Campus Essential',
    color: VIOLET,
    questions: [
      {
        question: 'Tell me about yourself, your technical background, and what drives you in technology.',
        tip: 'Focus on your journey: education, passion projects, key skills, and where you want to go next.',
        keywords: ['background', 'experience', 'skills', 'studied', 'worked', 'project', 'language', 'framework', 'degree', 'college', 'engineering', 'develop', 'build', 'learn', 'passion', 'drive'],
        modelAnswer: 'Start with a 60-second summary: who you are (student/engineer), 1-2 major technical highlights (e.g. built a fullstack app with real-time features), and why you are excited about this specific opportunity.'
      },
      {
        question: 'Describe a challenging situation or conflict you faced in a team project. How did you resolve it?',
        tip: 'Use the STAR method: Situation → Task → Action → Result. Emphasize active listening and mutual resolution.',
        keywords: ['conflict', 'team', 'disagreement', 'listen', 'perspective', 'compromise', 'resolution', 'agreed', 'outcome', 'respect', 'situation', 'result', 'discussion', 'aligned'],
        modelAnswer: 'Explain the context without blaming others, how you initiated an open conversation to compare trade-offs, and how the team aligned on the best technical decision.'
      },
      {
        question: 'What is your greatest technical or professional weakness, and what active steps are you taking to improve?',
        tip: 'Choose a real weakness (not a humblebrag), explain its impact, and highlight the concrete habit or tool you use to manage it.',
        keywords: ['weakness', 'improve', 'learning', 'habit', 'practice', 'course', 'documentation', 'feedback', 'working on', 'schedule', 'communication', 'progress'],
        modelAnswer: 'Mention an authentic growth area (e.g., getting too deep into optimization early on, or public speaking) and the active system you implemented (e.g., setting strict timeboxes, presenting in college tech clubs).'
      },
      {
        question: 'Describe a project deadline or requirement that seemed impossible. How did you prioritize deliverables?',
        tip: 'Highlight prioritization: MVP scoping, communication with stakeholders/mentors, and execution under pressure.',
        keywords: ['deadline', 'prioritize', 'scope', 'mvp', 'deliver', 'pressure', 'timeline', 'task', 'core', 'feature', 'milestone', 'result', 'managed'],
        modelAnswer: 'Explain how you broke down requirements into non-negotiable core features vs nice-to-haves, communicated trade-offs, and successfully shipped the essential deliverable on time.'
      },
      {
        question: 'Where do you see yourself in 3 to 5 years, and why are you interested in our company?',
        tip: 'Align your personal career growth (technical depth, system ownership, mentoring) with company impact.',
        keywords: ['goal', 'career', 'grow', 'lead', 'architect', 'contribute', 'learn', 'team', 'company', 'impact', 'senior', 'specialize', 'skill', 'future', 'years', 'ownership'],
        modelAnswer: 'Express desire to master production-scale engineering, take ownership of critical service components, and contribute to high-impact products within the company.'
      }
    ]
  },
  {
    id: 'software_engineering',
    title: 'Core Software Engineering & CS',
    description: 'OOP vs Functional, Database Indexing, Concurrency, Networking, and Debugging.',
    icon: '💻',
    badge: 'Technical Round',
    color: BLUE,
    questions: [
      {
        question: 'Explain the core principles of Object-Oriented Programming (OOP) versus Functional Programming.',
        tip: 'Compare state encapsulation & inheritance in OOP with pure functions & immutability in Functional Programming.',
        keywords: ['oop', 'encapsulation', 'polymorphism', 'inheritance', 'abstraction', 'functional', 'pure function', 'immutability', 'side effects', 'state', 'objects', 'classes', 'lambda'],
        modelAnswer: 'Contrast OOP (encapsulation of mutable state inside objects with inheritance and polymorphism) against FP (composition of pure functions with immutable data, avoiding side effects).'
      },
      {
        question: 'How does database indexing work under the hood (e.g., B-Trees), and what are the performance trade-offs?',
        tip: 'Explain B-Tree search complexity (O(log N)), clustered vs non-clustered, and write amplification during inserts/updates.',
        keywords: ['index', 'b-tree', 'btree', 'query', 'performance', 'scan', 'lookup', 'write', 'insert', 'tradeoff', 'hash', 'table', 'disk', 'memory', 'clustered', 'read'],
        modelAnswer: 'Indexes maintain balanced tree structures (B-Tree/B+ Tree) that reduce lookup complexity from O(N) full table scan to O(log N). Trade-off: faster reads vs slower writes/storage overhead.'
      },
      {
        question: 'Explain how the HTTPS / TLS handshake secures communication between a client and server.',
        tip: 'Cover asymmetric key exchange (RSA/Diffie-Hellman), certificate validation, and symmetric session encryption.',
        keywords: ['https', 'tls', 'ssl', 'handshake', 'certificate', 'ca', 'public key', 'private key', 'symmetric', 'asymmetric', 'encryption', 'session key', 'cipher', 'security'],
        modelAnswer: 'Client and server agree on cipher suite; server shares TLS certificate; client validates CA; asymmetric crypto generates a shared symmetric session key for fast, encrypted data transmission.'
      },
      {
        question: 'What is the difference between concurrency and parallelism? How do you prevent race conditions and deadlocks?',
        tip: 'Concurrency is dealing with lots of things at once; parallelism is doing lots of things simultaneously. Mention mutexes, locks, and atomic operations.',
        keywords: ['concurrency', 'parallelism', 'thread', 'process', 'cpu', 'core', 'race condition', 'deadlock', 'mutex', 'lock', 'semaphore', 'atomic', 'synchronization'],
        modelAnswer: 'Concurrency is about structure (multiple tasks progressing concurrently on 1+ cores); parallelism is execution (simultaneously on multiple hardware cores). Prevent race conditions using mutexes, atomic operations, or lock-free data structures.'
      },
      {
        question: 'Walk me through how you systematically isolate, debug, and fix a critical production bug.',
        tip: 'Describe reproduction, log analysis, metrics/APM, minimal test reproduction, hotfix deployment, and root cause analysis (post-mortem).',
        keywords: ['debug', 'log', 'reproduce', 'isolate', 'stack', 'breakpoint', 'test', 'monitor', 'trace', 'error', 'exception', 'fix', 'root cause', 'postmortem', 'metrics', 'apm', 'rollback'],
        modelAnswer: '1. Verify severity and assess blast radius (rollback if critical). 2. Reproduce with structured logs/traces. 3. Write a failing regression test. 4. Implement hotfix, review, and run post-mortem.'
      }
    ]
  },
  {
    id: 'fullstack_web',
    title: 'Full Stack & Web Architecture',
    description: 'Critical rendering path, JWT vs Sessions, React State, RESTful APIs, and Microservices.',
    icon: '🌐',
    badge: 'Web & Systems',
    color: TEAL,
    questions: [
      {
        question: 'Explain the critical rendering path in modern browsers and how you optimize web application performance.',
        tip: 'Cover HTML -> DOM, CSS -> CSSOM, Render Tree, Layout, and Paint. Mention code splitting, lazy loading, and asset minification.',
        keywords: ['dom', 'cssom', 'render tree', 'layout', 'paint', 'composite', 'critical path', 'bundle', 'lazy load', 'code split', 'performance', 'fcp', 'lcp', 'assets', 'render'],
        modelAnswer: 'Browser parses HTML into DOM, CSS into CSSOM, combines them into a Render Tree, calculates Layout coordinates, and Paints pixels. Optimize via code splitting, deferring non-critical CSS/JS, and optimizing image assets.'
      },
      {
        question: 'Compare JWT-based stateless authentication with stateful session-based cookies. What are the security trade-offs?',
        tip: 'Explain scalability benefits of stateless tokens vs revocation challenges, XSS vs CSRF vulnerability mitigations.',
        keywords: ['jwt', 'token', 'session', 'cookie', 'stateless', 'stateful', 'redis', 'xss', 'csrf', 'httpOnly', 'expiration', 'refresh token', 'revocation', 'scalability', 'security'],
        modelAnswer: 'JWTs are self-contained and stateless (ideal for horizontal scaling across microservices), but hard to revoke before expiry. Sessions require central state (e.g. Redis) but offer immediate revocation. Protect with httpOnly, SameSite cookies.'
      },
      {
        question: 'Explain state management in modern React: when do you use local state, Context API, and external stores like Redux or Zustand?',
        tip: 'Local state for isolated component UI; Context for low-frequency global config (theme, auth); Zustand/Redux for high-frequency shared state.',
        keywords: ['react', 'state', 'useState', 'context', 'redux', 'zustand', 're-render', 'prop drilling', 'global', 'store', 'action', 'performance', 'selector'],
        modelAnswer: 'Use useState/useReducer for component-scoped UI state; Context API for low-frequency broad state (theme, user auth); and external stores (Zustand/Redux) with selectors to avoid unnecessary re-renders in complex data flows.'
      },
      {
        question: 'How do you design a scalable RESTful API with proper pagination, rate limiting, and idempotency?',
        tip: 'Cover cursor-based pagination, HTTP status codes, Idempotency-Keys for POST, and token bucket rate limiting.',
        keywords: ['rest', 'api', 'pagination', 'cursor', 'offset', 'rate limit', 'token bucket', 'idempotency', 'status code', 'http', 'header', 'versioning', 'cache', 'etag'],
        modelAnswer: 'Use cursor-based pagination for large datasets (faster than offset), enforce rate limiting via Redis token-bucket algorithms, use Idempotency-Keys for mutations, and return proper HTTP semantics (200, 201, 429).'
      },
      {
        question: 'What are the trade-offs between a monolithic architecture and microservices, and when should a team migrate?',
        tip: 'Monolith is simpler to deploy and debug; microservices provide independent scaling and team autonomy but introduce network latency and distributed complexity.',
        keywords: ['monolith', 'microservices', 'distributed', 'scaling', 'deploy', 'network', 'latency', 'complexity', 'database', 'service', 'event', 'grpc', 'domain', 'team'],
        modelAnswer: 'Monoliths offer single-codebase velocity, easy debugging, and ACID transactions. Microservices allow independent scaling and decoupled deployments, but introduce network latency, distributed data consistency challenges, and operational overhead.'
      }
    ]
  },
  {
    id: 'company_placement',
    title: 'Campus Drives (FAANG & MNCs)',
    description: 'Amazon Leadership Principles, Google scalability, Caching strategies, and Placement Pitch.',
    icon: '🏢',
    badge: 'Campus Placement',
    color: GREEN,
    questions: [
      {
        question: 'Amazon Leadership Principle: Tell me about a time you demonstrated Customer Obsession over short-term expediency.',
        tip: 'Show that you worked backwards from the user problem, advocated for the user, and prioritized quality over shortcuts.',
        keywords: ['customer', 'user', 'obsession', 'feedback', 'experience', 'client', 'quality', 'long-term', 'value', 'prioritize', 'problem', 'solution', 'outcome', 'impact'],
        modelAnswer: 'Describe a situation where a user or client had a recurring pain point, how you researched the root cause, and chose a sustainable solution that enhanced customer trust over an easy quick fix.'
      },
      {
        question: 'Amazon Leadership Principle: Describe a situation where you took Ownership of a problem outside your domain.',
        tip: 'Leaders act on behalf of the entire organization; they never say "that’s not my job".',
        keywords: ['ownership', 'responsibility', 'initiative', 'proactive', 'outside', 'team', 'resolved', 'lead', 'stepped up', 'accountability', 'impact', 'helped', 'fixed'],
        modelAnswer: 'Share a story where you noticed an unassigned bug, documentation gap, or infrastructure issue, took accountability without being prompted, and resolved it for the broader team.'
      },
      {
        question: 'Google Engineering: How do you design for scalability when a system experiences 10x sudden traffic spikes?',
        tip: 'Horizontal autoscaling, load balancers, CDN caching, asynchronous message queues (Kafka/RabbitMQ), and database read replicas.',
        keywords: ['scale', 'traffic', 'spike', 'load balancer', 'cdn', 'cache', 'queue', 'kafka', 'horizontal', 'autoscale', 'replica', 'sharding', 'database', 'resilience', 'circuit breaker'],
        modelAnswer: 'Implement CDN edge caching for static assets, layer Redis for database query caching, scale stateless application pods horizontally behind load balancers, and buffer writes via asynchronous message queues.'
      },
      {
        question: 'Technical Assessment: Explain how caching (like Redis or Memcached) works and how you prevent Cache Stampede and Stale Data.',
        tip: 'Cache-aside pattern, TTL expiration, mutex locks (single-flight) to prevent dog-piling, and cache invalidation strategies.',
        keywords: ['cache', 'redis', 'memcached', 'ttl', 'stale', 'stampede', 'invalidation', 'write-through', 'cache-aside', 'mutex', 'hit', 'miss', 'eviction', 'lru'],
        modelAnswer: 'In Cache-Aside, read from cache first; on cache miss, read from DB and populate cache with TTL. Prevent cache stampede by using distributed locks (or probabilistic early expiration) so only one worker queries the database.'
      },
      {
        question: 'HR Final Round: Why should we hire you over other qualified candidates from your campus?',
        tip: 'Combine technical fundamentals, proven execution in projects, learning agility, and cultural alignment.',
        keywords: ['hire', 'unique', 'skills', 'projects', 'fast learner', 'adapt', 'collaborate', 'passion', 'work ethic', 'impact', 'campus', 'growth', 'contribute', 'culture'],
        modelAnswer: 'Highlight your combination of solid computer science fundamentals, hands-on project execution, rapid adaptability to new stacks, and collaborative work ethic ready to contribute immediately.'
      }
    ]
  }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so uh', 'well uh', 'i mean', 'sort of', 'kind of'];

// ── Advanced Multi-Dimensional Speech & Knowledge Evaluation Engine ────────
export function evaluateAnswer(questionObj, answerText, elapsedSeconds = 0) {
  const text  = (answerText || '').trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wc    = words.length;

  // 1. Guard against empty or placeholder response
  if (wc === 0 || text === '(No response recorded)') {
    return {
      score: 0,
      relevanceScore: 0,
      contentScore: 0,
      lengthScore: 0,
      structureScore: 0,
      fluencyScore: 0,
      confidenceScore: 0,
      wordCount: 0,
      fillerCount: 0,
      wpm: 0,
      conceptsHit: [],
      conceptsMissed: questionObj?.keywords?.slice(0, 6) || [],
      critique: 'No response was recorded. Speak or type your response to receive an evaluation.',
      verdict: 'Skipped / No Answer',
      verdictColor: RED,
    };
  }

  // 2. Identify evasive / non-substantive responses
  const isEvasive = /^(i don't know|i do not know|no idea|i have no idea|not sure|i'm not sure|haven't learned|never heard of|cannot answer|can't answer|skip this)/i.test(text) && wc < 18;
  if (isEvasive) {
    return {
      score: 10,
      relevanceScore: 5,
      contentScore: 10,
      lengthScore: 10,
      structureScore: 10,
      fluencyScore: 25,
      confidenceScore: 10,
      wordCount: wc,
      fillerCount: 0,
      wpm: Math.round((wc / Math.max(1, elapsedSeconds)) * 60),
      conceptsHit: [],
      conceptsMissed: questionObj?.keywords?.slice(0, 6) || [],
      critique: 'Response indicated uncertainty without outlining foundational principles or architectural approaches.',
      verdict: 'Evasive / Incomplete',
      verdictColor: RED,
    };
  }

  // 3. Concept / Keyword Extraction (Hit vs Missed)
  const allKeywords = questionObj?.keywords || [];
  const conceptsHit = [];
  const conceptsMissed = [];

  allKeywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    const escaped = kwLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}`, 'i');
    if (regex.test(lower) || lower.includes(kwLower)) {
      if (!conceptsHit.includes(kw)) conceptsHit.push(kw);
    } else {
      if (!conceptsMissed.includes(kw)) conceptsMissed.push(kw);
    }
  });

  const targetConceptCount = Math.min(allKeywords.length, 5);
  const rawCoverage = targetConceptCount > 0 ? conceptsHit.length / targetConceptCount : 0.4;
  const coveragePercent = Math.min(100, Math.round(rawCoverage * 100));

  // 4. Content Depth (Word Count & Substantive Length)
  let depthScore = 0;
  if      (wc < 10)   depthScore = 15;
  else if (wc < 25)   depthScore = 35;
  else if (wc < 50)   depthScore = 65;
  else if (wc <= 140) depthScore = 95;
  else if (wc <= 190) depthScore = 100;
  else                depthScore = Math.max(70, 100 - (wc - 190) * 0.25);

  // 5. Topical Relevance Score
  let relevanceScore = 0;
  if (wc < 10) {
    relevanceScore = Math.min(20, Math.round(coveragePercent * 0.2));
  } else if (wc < 25) {
    relevanceScore = Math.min(45, Math.round(coveragePercent * 0.55));
  } else {
    relevanceScore = Math.min(100, Math.round(coveragePercent * 0.85 + (depthScore >= 65 ? 15 : 0)));
  }

  if (conceptsHit.length === 0 && allKeywords.length > 0) {
    relevanceScore = Math.min(relevanceScore, 20);
  }

  // 6. Fluency & Verbal Filler Analysis
  const fillerCount = FILLER_WORDS.reduce((n, f) => {
    const parts = lower.split(f);
    return n + (parts.length - 1);
  }, 0);
  const fillerRatio = wc > 0 ? (fillerCount / wc) * 100 : 0;
  let fluencyScore = 0;
  if (wc < 10) {
    fluencyScore = 20;
  } else {
    fluencyScore = Math.max(15, Math.round(100 - fillerRatio * 15));
  }

  // 7. Structure & STAR Framework Analysis
  const hasIntro = /\b(in my|when i|during|for instance|to begin with|firstly|first|at its core|fundamentally|in this case|when working on|my experience|the reason)\b/i.test(lower);
  const hasAction = /\b(i implemented|i designed|i built|we decided|i chose|specifically|by using|we used|to solve|to address|i configured|i prioritized|i optimized)\b/i.test(lower);
  const hasImpactOrResult = /\b(as a result|consequently|ultimately|which improved|this reduced|the outcome|in conclusion|finally|this ensured|trade-off|tradeoff|impact)\b/i.test(lower);
  const hasSentences = (text.split(/[.!?]+/).filter(s => s.trim().length > 3)).length >= 3;

  let structureScore = 20;
  if (wc >= 15) {
    if (hasIntro)          structureScore += 25;
    if (hasAction)         structureScore += 25;
    if (hasImpactOrResult) structureScore += 20;
    if (hasSentences)      structureScore += 10;
  } else {
    structureScore = 15;
  }
  structureScore = Math.min(100, structureScore);

  // 8. Confidence & Assertive Voice
  const uncertainPhrases = ['i think', 'i guess', 'maybe', 'perhaps', 'not sure', "i don't know", 'kind of', 'sort of', 'probably', 'might be', 'i suppose'];
  const confidentPhrases = ['i built', 'i led', 'i designed', 'i implemented', 'i achieved', 'i resolved', 'i engineered', 'i ensured', 'i optimized', 'i verified'];
  const uncertainCount   = uncertainPhrases.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);
  const confidentCount   = confidentPhrases.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);

  let confidenceScore = 50;
  if (wc < 10) {
    confidenceScore = 15;
  } else {
    confidenceScore = Math.min(100, Math.max(20, 55 + confidentCount * 12 - uncertainCount * 10));
  }

  // 9. Speaking Pace (WPM)
  const effectiveSecs = Math.max(1, elapsedSeconds);
  const wpm = Math.round((wc / effectiveSecs) * 60);

  // 10. Composite Score (Relevance 40%, Depth 25%, Structure 15%, Fluency 10%, Confidence 10%)
  const qComposite = Math.round(
    relevanceScore  * 0.40 +
    depthScore      * 0.25 +
    structureScore  * 0.15 +
    fluencyScore    * 0.10 +
    confidenceScore * 0.10
  );

  // 11. Dynamic Question-Specific Critique
  let critique = '';
  if (qComposite >= 80) {
    critique = `Excellent answer! Covered ${conceptsHit.length} key concepts with strong logical structure and technical clarity.`;
  } else if (qComposite >= 65) {
    if (conceptsMissed.length > 0) {
      critique = `Solid explanation. To make this answer top-tier, explicitly address: ${conceptsMissed.slice(0, 3).join(', ')}.`;
    } else {
      critique = `Good grasp of core concepts. Deepen your response by discussing real-world trade-offs or measurable outcomes.`;
    }
  } else if (qComposite >= 45) {
    if (wc < 30) {
      critique = `Answer was brief (${wc} words). Aim for 60–100 words with concrete technical mechanisms and trade-offs.`;
    } else if (conceptsHit.length === 0) {
      critique = `Spoke well, but missed critical technical concepts like: ${conceptsMissed.slice(0, 3).join(', ')}.`;
    } else {
      critique = `Partially answered. Structure with the STAR framework (Situation → Task → Action → Result) and clarify trade-offs.`;
    }
  } else {
    if (wc < 15) {
      critique = `Insufficient response length (${wc} words). Practice explaining the concepts thoroughly using technical vocabulary.`;
    } else {
      critique = `Answer lacked topical alignment with the question. Review the model answer and focus on: ${conceptsMissed.slice(0, 4).join(', ')}.`;
    }
  }

  let verdict = 'Needs Work';
  let verdictColor = RED;
  if      (qComposite >= 80) { verdict = 'Strong Answer'; verdictColor = GREEN; }
  else if (qComposite >= 65) { verdict = 'Competent';     verdictColor = CYAN; }
  else if (qComposite >= 48) { verdict = 'Developing';    verdictColor = AMBER; }

  return {
    score:           qComposite,
    relevanceScore:  Math.round(relevanceScore),
    contentScore:    Math.round(depthScore),
    lengthScore:     Math.round(depthScore),
    structureScore:  Math.round(structureScore),
    fluencyScore:    Math.round(fluencyScore),
    confidenceScore: Math.round(confidenceScore),
    wordCount:       wc,
    fillerCount,
    wpm,
    conceptsHit,
    conceptsMissed:  conceptsMissed.slice(0, 6),
    critique,
    verdict,
    verdictColor,
  };
}

const analyseAnswer = evaluateAnswer;

function computeFinalScores(transcriptArr, trackQuestions) {
  if (!transcriptArr || transcriptArr.length === 0) {
    return {
      overall: 0,
      content: 0,
      fluency: 0,
      confidence: 0,
      structure: 0,
      relevance: 0,
      avgWpm: 0,
      totalFillers: 0,
      totalWords: 0,
      readinessVerdict: 'Incomplete / No Submission Recorded',
      readinessBadge: 'Incomplete',
      readinessColor: RED,
      perQuestionAnalyses: [],
    };
  }

  const analyses   = transcriptArr.map((t, idx) => evaluateAnswer(trackQuestions[idx], t.answer, t.duration || 45));
  const avg        = key => Math.round(analyses.reduce((s, a) => s + (a[key] || 0), 0) / analyses.length);
  const relevance  = avg('relevanceScore');
  const content    = avg('contentScore');
  const structure  = avg('structureScore');
  const fluency    = avg('fluencyScore');
  const confidence = avg('confidenceScore');
  const avgWpm     = avg('wpm');
  const totalFillers = analyses.reduce((s, a) => s + (a.fillerCount || 0), 0);
  const totalWords   = analyses.reduce((s, a) => s + (a.wordCount || 0), 0);

  const overall    = Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length);

  let readinessVerdict = 'Needs Significant Preparation — Review Core Concepts & STAR Format';
  let readinessBadge = 'Needs Development';
  let readinessColor = RED;

  if (overall >= 80) {
    readinessVerdict = '🏆 High Industry Readiness — Strong Candidate for Onsite & Placement Rounds';
    readinessBadge = 'Interview Ready';
    readinessColor = GREEN;
  } else if (overall >= 68) {
    readinessVerdict = '⚡ Solid Foundation — Candidate demonstrates good competency with minor polish required';
    readinessBadge = 'Placement Qualified';
    readinessColor = CYAN;
  } else if (overall >= 50) {
    readinessVerdict = '🛠️ Developing Candidate — Needs structured STAR practice and deeper technical depth';
    readinessBadge = 'Needs Polish';
    readinessColor = AMBER;
  }

  return {
    overall,
    content,
    fluency,
    confidence,
    structure,
    relevance,
    avgWpm,
    totalFillers,
    totalWords,
    readinessVerdict,
    readinessBadge,
    readinessColor,
    perQuestionAnalyses: analyses,
  };
}

function generateFeedback(scores, transcriptArr, analyses) {
  const strengths = [], improvements = [], tips = [];

  if (scores.relevance >= 70) {
    strengths.push('Topical Accuracy: Directly targeted core concepts, architectures, and terminology required by the interviewer.');
  }
  if (scores.content >= 70) {
    strengths.push('Substantive Depth: Provided thorough explanations with adequate context and implementation detail.');
  }
  if (scores.structure >= 70) {
    strengths.push('Logical Structure: Effectively framed answers with clear situation, action steps, and measurable outcomes.');
  }
  if (scores.fluency >= 75) {
    strengths.push('Articulate Delivery: Spoke smoothly with minimal filler sounds and disciplined cadence.');
  }
  if (scores.confidence >= 70) {
    strengths.push('Assertive Ownership: Used strong proactive voice ("I implemented", "I designed", "We configured").');
  }

  if (scores.relevance < 60) {
    improvements.push('Technical Keyword Coverage: Deepen your technical explanations by directly addressing required mechanisms, protocols, and data structures.');
  }
  if (scores.content < 60) {
    improvements.push('Elaborate with Evidence: Answers were on the shorter side. Aim for 60–120 words per response with real-world examples.');
  }
  if (scores.structure < 60) {
    improvements.push('STAR Framework Adoption: Anchor your answers in Situation → Task → Action → Result or Context → Problem → Solution → Trade-off.');
  }
  if (scores.fluency < 65) {
    improvements.push('Reduce Verbal Fillers: You used filler sounds (um, uh, like). Replace them with deliberate 1-second silent pauses.');
  }
  if (scores.confidence < 60) {
    improvements.push('Active Voice & Ownership: Replace hedging words ("I guess / maybe / not sure") with decisive active verbs.');
  }

  if (scores.avgWpm > 165) {
    tips.push(`Speaking Cadence: Your average pace was ${scores.avgWpm} WPM. Slow down slightly to 125–150 WPM so interviewers can follow technical details.`);
  } else if (scores.avgWpm < 100 && scores.avgWpm > 0) {
    tips.push(`Energy & Cadence: Your pace was ${scores.avgWpm} WPM. Speak with a bit more cadence and continuous flow.`);
  } else if (scores.avgWpm > 0) {
    tips.push(`Pacing: Your pace (${scores.avgWpm} WPM) was in the ideal conversational interview range (120–160 WPM).`);
  }

  if (scores.totalFillers > 4) {
    tips.push(`Filler Word Alert: You spoke ${scores.totalFillers} filler words across the session. Practice silent breathing pauses.`);
  }

  if (!strengths.length) {
    strengths.push('Completed session under proctored simulation conditions.');
  }
  if (!improvements.length) {
    improvements.push('Excellent overall performance. Maintain this consistent delivery in real-world corporate rounds.');
  }

  return { strengths, improvements, tips };
}

function getGrade(score) {
  return score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 68 ? 'B+' :
         score >= 58 ? 'B'  : score >= 48 ? 'C' : score >= 38 ? 'D'  : 'F';
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROBUST SPEECH RECOGNITION HOOK
// ═══════════════════════════════════════════════════════════════════════════
function useSpeechRecognition() {
  const [finalText,   setFinalText]   = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error,       setError]       = useState(null);
  const [volume,      setVolume]      = useState(0);

  const recRef         = useRef(null);
  const finalRef       = useRef('');
  const activeRef      = useRef(false);
  const restartTimer   = useRef(null);
  const restartCount   = useRef(0);
  const analyserRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const streamRef      = useRef(null);
  const silenceTimer   = useRef(null);
  const lastSpeechTime = useRef(Date.now());

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startVolumeMeter = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(Math.min(100, Math.round(avg * 2.5)));
        
        if (avg > 15) {
          lastSpeechTime.current = Date.now();
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('Volume meter failed:', err);
    }
  };

  const stopVolumeMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
  };

  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;
    return rec;
  }, []);

  const startRecognition = useCallback(() => {
    if (!activeRef.current) return;

    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.onerror = null;
        recRef.current.onresult = null;
        recRef.current.abort();
      } catch (_) {}
      recRef.current = null;
    }

    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      restartCount.current = 0;
    };

    rec.onresult = (e) => {
      let interim = '';
      let newlyFinalized = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          newlyFinalized += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (newlyFinalized) {
        finalRef.current = (finalRef.current + ' ' + newlyFinalized).trim().replace(/\s+/g, ' ');
        setFinalText(finalRef.current);
      }
      setInterimText(interim.trim());
      lastSpeechTime.current = Date.now();
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted') return;
      if (e.error === 'network') {
        if (activeRef.current && restartCount.current < 8) {
          restartTimer.current = setTimeout(startRecognition, 1200);
          restartCount.current++;
        }
        return;
      }
      setError(`Speech error: ${e.error}`);
    };

    rec.onend = () => {
      setInterimText('');
      if (activeRef.current) {
        restartTimer.current = setTimeout(() => {
          startRecognition();
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    try {
      rec.start();
    } catch (_) {
      if (activeRef.current) {
        restartTimer.current = setTimeout(startRecognition, 400);
      }
    }
  }, [createRecognition]);

  const start = useCallback((existingText = '') => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    finalRef.current = existingText;
    setFinalText(existingText);
    setInterimText('');
    setError(null);
    restartCount.current = 0;
    activeRef.current = true;
    startRecognition();
    startVolumeMeter();
  }, [startRecognition, isSupported]);

  const stop = useCallback(() => {
    activeRef.current = false;
    restartCount.current = 0;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.abort();
      } catch (_) {}
      recRef.current = null;
    }
    setInterimText('');
    setIsListening(false);
    stopVolumeMeter();
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    setFinalText('');
    setInterimText('');
    restartCount.current = 0;
  }, []);

  useEffect(() => {
    const sTimer = silenceTimer.current;
    const rTimer = restartTimer.current;
    const rec = recRef.current;
    return () => {
      activeRef.current = false;
      if (rTimer) clearTimeout(rTimer);
      if (sTimer) clearTimeout(sTimer);
      if (rec) {
        try { rec.abort(); } catch {}
      }
      stopVolumeMeter();
    };
  }, []);

  const fullText = (finalText + (interimText ? ' ' + interimText : '')).trim();

  return {
    start, stop, reset,
    finalText, interimText, fullText,
    isListening, error, volume,
    isSupported, finalRef, setFinalText
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN MOCK INTERVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MockInterview() {
  const [activeTab,     setActiveTab]     = useState('practice'); // 'practice' | 'history'
  const [phase,         setPhase]         = useState('setup');    // 'setup' | 'interview' | 'result'
  const [selectedTrack, setSelectedTrack] = useState('hr_behavioral');
  
  // Media & Hardware
  const [camReady,      setCamReady]      = useState(false);
  const [micReady,      setMicReady]      = useState(false);
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [isActive,      setIsActive]      = useState(false);

  // Question & Timer State
  const [currentQ,      setCurrentQ]      = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [qElapsed,      setQElapsed]      = useState(0);

  // Audio & TTS
  const [isAiSpeaking,  setIsAiSpeaking]  = useState(false);
  const [ttsMuted,      setTtsMuted]      = useState(false);

  // Editing & Fallback
  const [isManualEdit,     setIsManualEdit]     = useState(false);
  const [manualText,       setManualText]       = useState('');
  const [showBriefWarning, setShowBriefWarning] = useState(false);

  // Proctored Metrics
  const [faceMetrics,   setFaceMetrics]   = useState({ faceDetected: false, expression: 'neutral' });
  const [expressionLog, setExpressionLog] = useState([]);
  const [transcript,    setTranscript]    = useState([]);
  const [answerScores,  setAnswerScores]  = useState([]);
  const [result,        setResult]        = useState(null);
  const [saving,        setSaving]        = useState(false);

  // History & Analytics Data
  const [historyList,   setHistoryList]   = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingHistory,setLoadingHistory]= useState(false);
  const [viewSession,   setViewSession]   = useState(null);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const timerRef     = useRef(null);
  const qTimerRef    = useRef(null);
  const detectRef    = useRef(null);
  const faceapi      = useRef(null);
  const transcriptRef= useRef([]);

  const stt = useSpeechRecognition();

  const currentTrackObj = INTERVIEW_TRACKS.find(t => t.id === selectedTrack) || INTERVIEW_TRACKS[0];
  const questionsList   = currentTrackObj.questions;
  const currentQObj     = questionsList[currentQ] || questionsList[0];

  // ── Text-to-Speech (AI Interviewer Voice) ──
  const speakQuestion = useCallback((text) => {
    if (!window.speechSynthesis || ttsMuted) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.0;
      u.lang = 'en-US';
      u.onstart = () => setIsAiSpeaking(true);
      u.onend   = () => setIsAiSpeaking(false);
      u.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch (_) {
      setIsAiSpeaking(false);
    }
  }, [ttsMuted]);

  // ── Load face-api on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const fa = await loadFaceApi();
        faceapi.current = fa;
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
          fa.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
        ]);
        setModelsLoaded(true);
        setFaceApiLoaded(true);
      } catch {
        setModelsLoaded(true);
        setFaceApiLoaded(false);
      }
    };
    load();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      stt.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch History when History Tab is activated ──
  const fetchHistoryAndAnalytics = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [hRes, aRes] = await Promise.all([
        interviewAPI.getHistory(),
        interviewAPI.getAnalytics().catch(() => ({ data: null }))
      ]);
      setHistoryList(hRes.data?.history || []);
      setAnalyticsData(aRes.data || null);
    } catch (err) {
      console.error('Failed to load history:', err);
      toast.error('Could not load past sessions.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryAndAnalytics();
    }
  }, [activeTab, fetchHistoryAndAnalytics]);

  // ── Reattach video stream when phase -> interview ──
  useEffect(() => {
    if (phase === 'interview' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // ── Master Session Timers ──
  useEffect(() => {
    if (!isActive) return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    qTimerRef.current = setInterval(() => setQElapsed(e => e + 1), 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(qTimerRef.current);
    };
  }, [isActive]);

  // ── Face Tracking Loop ──
  useEffect(() => {
    if (!isActive) return;
    detectRef.current = setInterval(async () => {
      if (faceapi.current && faceApiLoaded && videoRef.current?.readyState === 4) {
        try {
          const det = await faceapi.current
            .detectSingleFace(videoRef.current, new faceapi.current.TinyFaceDetectorOptions())
            .withFaceLandmarks().withFaceExpressions();
          if (det) {
            const ex  = det.expressions;
            const top = Object.entries(ex).sort((a, b) => b[1] - a[1])[0][0];
            const m   = {
              faceDetected: true, expression: top,
              eyeContact: Math.min(100, Math.round(ex.neutral * 100 + ex.happy * 60)),
              attention:  Math.min(100, Math.round((ex.neutral + ex.happy) * 100)),
              stress:     Math.min(100, Math.round((ex.angry + ex.fearful + ex.disgusted) * 100)),
            };
            setFaceMetrics(m);
            setExpressionLog(prev => [...prev, { time: elapsed, ...m }]);
          } else {
            setFaceMetrics(m => ({ ...m, faceDetected: false }));
          }
        } catch {}
      } else {
        setFaceMetrics(m => ({ ...m, faceDetected: true, expression: 'neutral' }));
      }
    }, 2000);
    return () => clearInterval(detectRef.current);
  }, [isActive, faceApiLoaded, elapsed]);

  // ── Camera Controls ──
  const startCamera = async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamReady(true);
      setMicReady(true);
      toast.success('Camera & microphone ready');
    } catch {
      toast.error('Could not access camera — check browser device permissions');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    clearInterval(qTimerRef.current);
    clearInterval(detectRef.current);
  }, []);

  // ── Interview Flow Handlers ──
  const startInterview = () => {
    transcriptRef.current = [];
    setTranscript([]);
    setAnswerScores([]);
    setExpressionLog([]);
    setElapsed(0);
    setQElapsed(0);
    setCurrentQ(0);
    setIsActive(true);
    setIsManualEdit(false);
    setManualText('');
    setShowBriefWarning(false);
    stt.reset();
    stt.start();
    setPhase('interview');

    // Announce first question with AI voice
    setTimeout(() => {
      speakQuestion(questionsList[0].question);
    }, 600);
  };

  const saveCurrentAnswer = useCallback(() => {
    const rawAnswer = isManualEdit
      ? manualText
      : (stt.finalRef.current || stt.fullText || manualText);

    const answer = (rawAnswer || '').trim() || '(No response recorded)';
    const entry  = {
      question: currentQObj.question,
      answer,
      timestamp: elapsed,
      duration: Math.max(5, qElapsed),
      track: currentTrackObj.title
    };

    const scores = evaluateAnswer(currentQObj, answer, Math.max(5, qElapsed));

    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(prev    => [...prev, entry]);
    setAnswerScores(prev  => [...prev, {
      ...scores,
      question: currentQObj.question,
      answer,
      tip: currentQObj.tip,
      modelAnswer: currentQObj.modelAnswer
    }]);

    // Reset STT & editing states
    stt.reset();
    setIsManualEdit(false);
    setManualText('');

    return transcriptRef.current;
  }, [currentQObj, currentTrackObj.title, elapsed, isManualEdit, manualText, qElapsed, stt]);

  const finishInterview = useCallback(async () => {
    clearInterval(timerRef.current);
    clearInterval(qTimerRef.current);
    clearInterval(detectRef.current);
    stt.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsActive(false);

    const finalTranscript = saveCurrentAnswer();
    const speechScores    = computeFinalScores(finalTranscript, questionsList);

    const log         = expressionLog;
    const faceAvg     = key => log.length
      ? Math.round(log.reduce((s, e) => s + (e[key] || 0), 0) / log.length)
      : null;

    const fEye  = faceAvg('eyeContact');
    const fAtt  = faceAvg('attention');
    const fStr  = faceAvg('stress');

    const finalResult = {
      track:               currentTrackObj.title,
      overallScore:        speechScores.overall,
      contentScore:        speechScores.content,
      fluencyScore:        speechScores.fluency,
      confidenceScore:     speechScores.confidence,
      structureScore:      speechScores.structure,
      relevanceScore:      speechScores.relevance,
      avgWpm:              speechScores.avgWpm,
      totalFillers:        speechScores.totalFillers,
      totalWords:          speechScores.totalWords,
      readinessVerdict:    speechScores.readinessVerdict,
      readinessBadge:      speechScores.readinessBadge,
      readinessColor:      speechScores.readinessColor,
      eyeContactScore:     fEye !== null ? Math.round(speechScores.confidence * 0.7 + fEye * 0.3) : speechScores.confidence,
      attentionScore:      fAtt !== null ? Math.round(speechScores.structure  * 0.7 + fAtt * 0.3) : speechScores.structure,
      stressScore:         fStr !== null ? Math.round((100 - speechScores.fluency) * 0.7 + fStr * 0.3) : Math.max(0, 100 - speechScores.fluency),
      duration:            elapsed,
      grade:               getGrade(speechScores.overall),
      feedback:            generateFeedback(speechScores, finalTranscript, speechScores.perQuestionAnalyses),
      perQuestionAnalyses: speechScores.perQuestionAnalyses,
    };
    setResult(finalResult);

    setSaving(true);
    try {
      await interviewAPI.save({
        track:               currentTrackObj.title,
        durationSeconds:     elapsed,
        overallScore:        finalResult.overallScore,
        eyeContactScore:     finalResult.eyeContactScore,
        confidenceScore:     finalResult.confidenceScore,
        attentionScore:      finalResult.attentionScore,
        stressScore:         finalResult.stressScore,
        transcript:          finalTranscript,
        expressionLog:       log.slice(-20),
        perQuestionAnalyses: speechScores.perQuestionAnalyses,
        verdict:             speechScores.readinessVerdict,
        aiFeedback: {
          track:               currentTrackObj.title,
          strengths:           finalResult.feedback.strengths,
          improvements:        finalResult.feedback.improvements,
          tips:                finalResult.feedback.tips,
          scores:              speechScores,
          readinessVerdict:    speechScores.readinessVerdict,
          perQuestionAnalyses: speechScores.perQuestionAnalyses,
        },
      });
      toast.success('Interview evaluation securely saved to history!');
    } catch (e) {
      console.error('Save failed:', e);
      toast.error('Session finished (local evaluation available).');
    }
    setSaving(false);
    stopCamera();
    setPhase('result');
  }, [currentTrackObj.title, elapsed, expressionLog, questionsList, saveCurrentAnswer, stopCamera, stt]);

  const nextQuestion = useCallback(() => {
    saveCurrentAnswer();
    setQElapsed(0);
    setShowBriefWarning(false);

    if (currentQ < questionsList.length - 1) {
      const nextIdx = currentQ + 1;
      setCurrentQ(nextIdx);
      setTimeout(() => {
        speakQuestion(questionsList[nextIdx].question);
      }, 300);
    } else {
      finishInterview();
    }
  }, [currentQ, finishInterview, questionsList, saveCurrentAnswer, speakQuestion]);

  const handleProceedQuestion = () => {
    const rawAnswer = isManualEdit
      ? manualText
      : (stt.finalRef.current || stt.fullText || manualText);
    const wc = (rawAnswer || '').trim().split(/\s+/).filter(Boolean).length;
    if (wc < 15 && !showBriefWarning) {
      setShowBriefWarning(true);
      return;
    }
    setShowBriefWarning(false);
    nextQuestion();
  };

  const copyAssessmentSummary = () => {
    if (!result) return;
    const summaryText = `=== SMARTHIRE AI MOCK INTERVIEW ASSESSMENT REPORT ===
Track: ${result.track}
Overall Score: ${result.overallScore}/100 (Grade: ${result.grade})
Readiness Verdict: ${result.readinessVerdict}
Session Duration: ${fmt(result.duration)} | Total Words Spoken: ${result.totalWords || 0} | Avg Speaking Pace: ${result.avgWpm} WPM

--- COMPETENCY SCORES ---
• Topical Relevance: ${result.relevanceScore}% (Weight 40%)
• Content Depth: ${result.contentScore}% (Weight 25%)
• STAR Structure: ${result.structureScore}% (Weight 15%)
• Spoken Fluency: ${result.fluencyScore}% (Weight 10%)
• Confidence & Presence: ${result.confidenceScore}% (Weight 10%)
• Proctoring Eye Contact: ${result.eyeContactScore}%

--- QUESTION-BY-QUESTION EVALUATION ---
${(answerScores || []).map((sc, i) => `Q${i + 1}: ${sc.question}
  Score: ${sc.score !== undefined ? sc.score : sc.relevanceScore}/100 (${sc.verdict || 'Evaluated'})
  Concepts Covered: ${sc.conceptsHit?.length ? sc.conceptsHit.join(', ') : 'None detected'}
  Concepts Omitted: ${sc.conceptsMissed?.length ? sc.conceptsMissed.join(', ') : 'None'}
  Critique: ${sc.critique || 'Evaluated'}
  Candidate Response: "${sc.answer}"
`).join('\n')}
======================================================`;

    navigator.clipboard.writeText(summaryText);
    toast.success('Assessment report copied to clipboard!');
  };

  const resetAll = () => {
    setPhase('setup');
    setCamReady(false);
    setMicReady(false);
    setTranscript([]);
    setAnswerScores([]);
    setResult(null);
    setElapsed(0);
    setQElapsed(0);
    setCurrentQ(0);
    setExpressionLog([]);
    setShowBriefWarning(false);
    transcriptRef.current = [];
    stt.reset();
    setIsManualEdit(false);
    setManualText('');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Live answer analysis on current spoken or edited input
  const currentDisplayedText = isManualEdit ? manualText : stt.fullText;
  const liveScores = analyseAnswer(currentQObj, currentDisplayedText, Math.max(1, qElapsed));

  // WPM Category
  const wpmStatus = liveScores.wpm === 0 ? 'Not speaking'
    : liveScores.wpm < 110 ? 'Deliberate & Slow'
    : liveScores.wpm <= 165 ? 'Optimal Conversational Pace ⭐'
    : 'Fast Pace — Breathe & Slow Down';
  const wpmColor = liveScores.wpm === 0 ? '#64748b'
    : liveScores.wpm < 110 ? AMBER
    : liveScores.wpm <= 165 ? GREEN
    : RED;

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOP NAVIGATION TABS HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: '24px 20px', maxWidth: 1160, margin: '0 auto', fontFamily: "'Sora', sans-serif" }}>
      {/* Top Header & Tab Pill Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Brain size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                AI Mock Interview Simulator
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Real-time vocal transcription, conversational AI speech synthesis, speech pacing, & computer vision proctoring.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-card-high)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => { setActiveTab('practice'); if (phase === 'result') setPhase('setup'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'practice' ? CYAN : 'transparent',
              color: activeTab === 'practice' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none', transition: 'all 0.2s ease'
            }}
          >
            <Mic size={15} /> Practice Interview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'history' ? CYAN : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none', transition: 'all 0.2s ease'
            }}
          >
            <History size={15} /> Past Sessions & Analytics
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 2: PAST SESSIONS & PERFORMANCE DASHBOARD
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          {loadingHistory ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: CYAN }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Loading past interview attempts and AI analytics...</p>
            </div>
          ) : (
            <div>
              {/* Analytics Summary Banner */}
              {analyticsData?.averages && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: CYAN, marginBottom: 6 }}>
                      <Award size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Total Completed</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {analyticsData.totalSessions || historyList.length} Sessions
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Campus placement readiness</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GREEN, marginBottom: 6 }}>
                      <Sparkles size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Average Score</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: GREEN }}>
                      {analyticsData.averages.overall}%
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Latest Grade: {analyticsData.latestGrade || 'B'}</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: BLUE, marginBottom: 6 }}>
                      <Eye size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Avg Eye Contact</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: BLUE }}>
                      {analyticsData.averages.eyeContact}%
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Camera engagement index</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: VIOLET, marginBottom: 6 }}>
                      <BarChart2 size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Spoken Confidence</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: VIOLET }}>
                      {analyticsData.averages.confidence}%
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Assertive vocabulary score</span>
                  </div>
                </div>
              )}

              {/* Sessions List */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Past Interview Records ({historyList.length})
                  </h3>
                  <button
                    onClick={fetchHistoryAndAnalytics}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>

                {historyList.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>No interview attempts recorded yet.</p>
                    <p style={{ fontSize: 13, margin: '0 0 16px' }}>Complete your first mock interview to track speech pacing, eye contact, and AI feedback!</p>
                    <button
                      onClick={() => setActiveTab('practice')}
                      style={{ padding: '10px 20px', borderRadius: 8, background: CYAN, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Start Practice Interview
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {historyList.map((s, idx) => {
                      const isExpanded = viewSession === s.id;
                      return (
                        <div key={s.id || idx} style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card-high)', overflow: 'hidden' }}>
                          <div
                            onClick={() => setViewSession(isExpanded ? null : s.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.overallScore >= 75 ? 'rgba(22,163,74,0.15)' : 'rgba(79,70,229,0.15)', border: `1px solid ${s.overallScore >= 75 ? GREEN : CYAN}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: s.overallScore >= 75 ? GREEN : CYAN }}>{s.overallScore}%</span>
                                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{s.grade}</span>
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {s.track || s.company || 'HR & Behavioral Interview'}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                  {new Date(s.conductedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Duration: {s.duration}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ display: 'none', md: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                                <span>Eye Contact: <strong style={{ color: BLUE }}>{s.eyeContact}%</strong></span>
                                <span>Confidence: <strong style={{ color: GREEN }}>{s.confidence}%</strong></span>
                              </div>
                              <span style={{ fontSize: 12, color: CYAN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isExpanded ? 'Hide Details' : 'View Transcript'}
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Transcript & Evaluation Details */}
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-base)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  📝 Session Assessment & Responses ({s.transcript?.length || 0} Questions Answered)
                                </div>
                                {s.verdict && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: s.overallScore >= 75 ? GREEN : AMBER }}>
                                    {s.verdict}
                                  </span>
                                )}
                              </div>
                              {(!s.transcript || s.transcript.length === 0) ? (
                                <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: 0 }}>No transcript lines recorded for this session.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {s.transcript.map((item, qIdx) => {
                                    const analysis = s.perQuestionAnalyses?.[qIdx];
                                    return (
                                      <div key={qIdx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                                            Q{qIdx + 1}: {item.question}
                                          </p>
                                          {analysis && (
                                            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${analysis.verdictColor || CYAN}15`, color: analysis.verdictColor || CYAN }}>
                                              {analysis.score !== undefined ? `${analysis.score}/100` : ''} {analysis.verdict || ''}
                                            </span>
                                          )}
                                        </div>

                                        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: item.answer === '(No response recorded)' ? 'italic' : 'normal' }}>
                                          "{item.answer}"
                                        </p>

                                        {analysis?.conceptsHit?.length > 0 && (
                                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, marginRight: 2 }}>Concepts Hit:</span>
                                            {analysis.conceptsHit.map(c => (
                                              <span key={c} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(22,163,74,0.1)', color: GREEN }}>
                                                ✓ {c}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {analysis?.critique && (
                                          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                            💡 {analysis.critique}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 1: PRACTICE INTERVIEW FLOW
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'practice' && (
        <div>
          {/* ─────────────────────────────────────────────────────────────
              SCREEN 1: SETUP & TRACK SELECTION
          ───────────────────────────────────────────────────────────── */}
          {phase === 'setup' && (
            <div>
              {/* STT not supported warning */}
              {!stt.isSupported && (
                <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <AlertCircle size={18} color={RED} style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: RED, lineHeight: 1.5 }}>
                    <strong>Speech recognition is not active in this browser.</strong> Use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for real-time speech transcription (manual typing mode is also available).
                  </p>
                </div>
              )}

              {/* Step 1: Select Track */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Step 1: Choose Your Interview Track
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {INTERVIEW_TRACKS.map(tr => {
                    const isSelected = selectedTrack === tr.id;
                    return (
                      <div
                        key={tr.id}
                        onClick={() => setSelectedTrack(tr.id)}
                        style={{
                          background: isSelected ? `${tr.color}10` : 'var(--bg-card)',
                          border: `2px solid ${isSelected ? tr.color : 'var(--border)'}`,
                          borderRadius: 14,
                          padding: 18,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? `0 0 16px ${tr.color}25` : 'none'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <span style={{ fontSize: 28 }}>{tr.icon}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `${tr.color}20`, color: tr.color, border: `1px solid ${tr.color}40` }}>
                              {tr.badge}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {tr.title}
                          </h3>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {tr.description}
                          </p>
                        </div>

                        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: isSelected ? tr.color : '#64748b' }}>
                          <span>{tr.questions.length} Targeted Questions</span>
                          {isSelected && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>✓ Selected</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Camera & System Readiness */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Camera Preview */}
                <GlowCard title="Camera & AI Vision Preview" accent={CYAN}>
                  <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', marginBottom: 14 }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline autoPlay />
                    {!camReady && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <User size={38} color="#475569" />
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Click below to grant camera access</p>
                      </div>
                    )}
                    {camReady && (
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(22,163,74,0.2)', border: '1px solid rgba(22,163,74,0.4)', borderRadius: 6, padding: '3px 8px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                        <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>CAM ACTIVE</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={startCamera}
                    style={{ ...BTN, width: '100%', background: camReady ? 'rgba(79,70,229,0.1)' : CYAN, color: camReady ? CYAN : '#ffffff', border: `1px solid ${CYAN}` }}
                  >
                    {camReady ? <><CheckCircle size={15} /> Camera & Mic Active</> : <><Video size={15} /> Start Camera & Mic</>}
                  </button>
                </GlowCard>

                {/* System Readiness Checklist */}
                <GlowCard title="Hardware & AI Engine Checklist" accent={VIOLET}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <strong style={{ color: CYAN }}>Conversational AI Simulation</strong>
                      <br />• AI voice speaks questions aloud via Speech Synthesis.
                      <br />• Measures speaking pace (Words Per Minute) & filler words.
                      <br />• Evaluates response relevance, fluency, confidence, & structure.
                    </div>

                    {[
                      { label: 'Video Camera Feed',        ready: camReady,        icon: <Video size={14} /> },
                      { label: 'Microphone Audio Input',    ready: micReady,        icon: <Mic size={14} /> },
                      { label: 'Speech Recognition Engine', ready: stt.isSupported, icon: <Volume2 size={14} /> },
                      { label: 'Computer Vision AI Models', ready: modelsLoaded,    icon: <Brain size={14} /> },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
                          {item.icon}{item.label}
                        </div>
                        {item.ready ? (
                          <span style={{ color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={13} /> Ready
                          </span>
                        ) : (
                          <span style={{ color: RED, fontWeight: 600 }}>Action Required</span>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={startInterview}
                      disabled={!camReady}
                      style={{
                        ...BTN,
                        background: camReady ? GREEN : 'var(--bg-card-high)',
                        color: camReady ? '#ffffff' : '#64748b',
                        border: 'none',
                        marginTop: 8,
                        boxShadow: camReady ? '0 0 16px rgba(22,163,74,0.35)' : 'none'
                      }}
                    >
                      <Play size={16} /> Begin {currentTrackObj.title} Interview
                    </button>
                  </div>
                </GlowCard>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SCREEN 2: LIVE PROCTORED INTERVIEW
          ───────────────────────────────────────────────────────────── */}
          {phase === 'interview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 20px', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}` }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Live Session: {currentTrackObj.title}
                  </span>
                </div>

                {/* Question Stopwatch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card-high)', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <Clock size={13} color={AMBER} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: AMBER, fontFamily: 'monospace' }}>
                      Question Time: {fmt(qElapsed)}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>| Total: {fmt(elapsed)}</span>
                  </div>

                  {/* AI TTS Controls */}
                  <button
                    onClick={() => speakQuestion(currentQObj.question)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: 'rgba(79,70,229,0.1)', border: `1px solid ${CYAN}33`, color: CYAN, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    title="Click to have AI replay the question aloud"
                  >
                    <Volume2 size={13} /> Replay Audio
                  </button>
                  <button
                    onClick={() => {
                      if (!ttsMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                      setTtsMuted(m => !m);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: ttsMuted ? RED : '#64748b', fontSize: 11, cursor: 'pointer' }}
                    title={ttsMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                  >
                    {ttsMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                </div>

                {/* Question Count & Mic Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: stt.isListening ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', border: `1px solid ${stt.isListening ? GREEN : RED}33`, borderRadius: 8 }}>
                    {stt.isListening ? <Mic size={12} color={GREEN} /> : <MicOff size={12} color={RED} />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: stt.isListening ? GREEN : RED }}>
                      {stt.isListening ? 'Mic Active' : 'Connecting'}
                    </span>
                    {/* Live Volume visualizer */}
                    {stt.isListening && (
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
                        {[0.2, 0.45, 0.7, 0.95].map((th, i) => (
                          <div key={i} style={{ width: 2.5, borderRadius: 2, height: `${(i + 1) * 2.5 + 2}px`, background: stt.volume / 100 >= th ? GREEN : 'var(--border)' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Q {currentQ + 1} of {questionsList.length}
                  </span>
                </div>
              </div>

              {/* Main Workspace: Left Camera/Analytics vs Right Question/Transcript */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
                {/* ── LEFT PANE: Camera & Live Delivery Analytics ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Camera PIP Card */}
                  <div style={{ position: 'relative', background: '#000', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/3', border: '1px solid var(--border)' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline autoPlay />
                    {/* AI Speaking Soundwave Indicator */}
                    {isAiSpeaking && (
                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.85)', padding: '4px 10px', borderRadius: 20, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                        <Volume2 size={12} style={{ animation: 'pulse 1s infinite' }} /> AI Interviewer Speaking...
                      </div>
                    )}
                    {/* Face status badge */}
                    <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: faceMetrics.faceDetected ? GREEN : RED }} />
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>
                          {faceMetrics.faceDetected ? `Expression: ${faceMetrics.expression}` : 'Face Out of Frame'}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Proctored</span>
                    </div>
                  </div>

                  {/* Live Speech & Pacing Meter */}
                  <GlowCard title="Live Speech Analytics" accent={CYAN} padding={16}>
                    {/* Speech Pace (WPM) Badge */}
                    <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>Speaking Pace (WPM)</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: wpmColor }}>
                          {liveScores.wpm} WPM
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: wpmColor, fontWeight: 600 }}>
                        {wpmStatus}
                      </div>
                    </div>

                    {/* Filler Word Counter */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 10px', background: liveScores.fillerCount > 0 ? 'rgba(217,119,6,0.08)' : 'var(--bg-card-high)', border: `1px solid ${liveScores.fillerCount > 0 ? AMBER : 'var(--border)'}40`, borderRadius: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Filler Words Detected:</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: liveScores.fillerCount > 2 ? AMBER : GREEN }}>
                        {liveScores.fillerCount} fillers
                      </span>
                    </div>

                    {/* Word Target Progress */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Word Count</span>
                        <span style={{ fontWeight: 700, color: liveScores.wordCount >= 60 ? GREEN : liveScores.wordCount >= 30 ? AMBER : RED }}>
                          {liveScores.wordCount} / 60–120 target
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg-card-high)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (liveScores.wordCount / 90) * 100)}%`, height: '100%', background: liveScores.wordCount >= 60 ? GREEN : AMBER, borderRadius: 3 }} />
                      </div>
                    </div>

                    {/* Metric Bars */}
                    <MetricBar label="Relevance"  value={liveScores.relevanceScore}  color={VIOLET} />
                    <MetricBar label="Fluency"    value={liveScores.fluencyScore}    color={GREEN} />
                    <MetricBar label="Confidence" value={liveScores.confidenceScore} color={CYAN} />
                    <MetricBar label="Structure"  value={liveScores.structureScore}  color={AMBER} />
                  </GlowCard>
                </div>

                {/* ── RIGHT PANE: Question Statement & Live Transcript ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <GlowCard accent={VIOLET} padding={20}>
                    {/* Question Header & Prompt */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${VIOLET}20`, border: `1.5px solid ${VIOLET}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: VIOLET }}>
                        {currentQ + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Question {currentQ + 1} of {questionsList.length}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.55, margin: '0 0 10px', fontFamily: "'Sora', sans-serif" }}>
                      {currentQObj.question}
                    </h2>

                    <div style={{ background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        💡 <strong style={{ color: CYAN }}>Interview Strategy Tip:</strong> {currentQObj.tip}
                      </p>
                    </div>

                    {/* Live Concept Coverage Tracker */}
                    <div style={{ background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Target size={13} color={CYAN} /> Target Technical Concepts
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: (liveScores.conceptsHit?.length || 0) > 0 ? GREEN : '#64748b' }}>
                          {liveScores.conceptsHit?.length || 0} / {Math.min(currentQObj.keywords.length, 6)} detected in speech
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {currentQObj.keywords.slice(0, 8).map(kw => {
                          const hit = (liveScores.conceptsHit || []).includes(kw);
                          return (
                            <span
                              key={kw}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: hit ? 'rgba(22, 163, 74, 0.15)' : 'var(--bg-base)',
                                border: `1px solid ${hit ? GREEN : 'var(--border)'}`,
                                color: hit ? GREEN : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {hit ? '✓' : '○'} {kw}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Transcription & Dual-Input Box */}
                    <div style={{ background: 'var(--bg-base)', border: `1.5px solid ${stt.isListening ? CYAN : 'var(--border)'}`, borderRadius: 12, padding: 16, marginBottom: 16, minHeight: 140 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: stt.isListening ? GREEN : '#64748b', ...(stt.isListening ? { animation: 'pulse 1s infinite' } : {}) }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isManualEdit ? '✏️ Text Edit Mode (Manual Typing)' : '🎤 Live Speech Transcription'}
                          </span>
                        </div>

                        {/* Toggle Manual Edit Mode Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isManualEdit) {
                              setManualText(stt.finalRef.current || stt.fullText || '');
                            } else {
                              stt.setFinalText(manualText);
                              stt.finalRef.current = manualText;
                            }
                            setIsManualEdit(e => !e);
                          }}
                          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: CYAN, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit3 size={11} />
                          {isManualEdit ? 'Switch to Live Voice' : 'Edit Transcript / Type Answer'}
                        </button>
                      </div>

                      {/* Display Mode: Textarea if editing, else Live Text */}
                      {isManualEdit ? (
                        <textarea
                          value={manualText}
                          onChange={e => setManualText(e.target.value)}
                          placeholder="Type or correct your answer here if microphone recognition misheard any technical term..."
                          rows={5}
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: "'Sora', sans-serif" }}
                        />
                      ) : (
                        <div>
                          {stt.finalText && (
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                              {stt.finalText}
                            </p>
                          )}
                          {stt.interimText && (
                            <p style={{ margin: stt.finalText ? '4px 0 0' : 0, fontSize: 13, color: CYAN, lineHeight: 1.7, fontStyle: 'italic' }}>
                              {stt.interimText}…
                            </p>
                          )}
                          {!stt.finalText && !stt.interimText && (
                            <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic', lineHeight: 1.7 }}>
                              {stt.isListening ? 'Speak naturally into your microphone — your words are transcribed live...' : 'Connecting microphone...'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Short Answer Warning Dialog */}
                    {showBriefWarning && (
                      <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: 'rgba(217,119,6,0.12)', border: `1px solid ${AMBER}60` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: AMBER, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                          <AlertCircle size={16} /> Short Answer Detected ({liveScores.wordCount} words)
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Mock interviews evaluate technical depth, keyword coverage, and structured reasoning. Answers with fewer than 15 words receive low relevance and content scores.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => setShowBriefWarning(false)}
                            style={{ ...BTN, background: CYAN, color: '#fff', fontSize: 11, padding: '7px 14px' }}
                          >
                            Continue Speaking / Typing
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBriefWarning(false);
                              nextQuestion();
                            }}
                            style={{ ...BTN, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11, padding: '7px 14px' }}
                          >
                            Submit Anyway
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Next / Submit Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {currentQ < questionsList.length - 1 ? 'Answer will be evaluated in your final assessment' : 'Final response — full evaluation will be generated'}
                      </span>
                      <button
                        onClick={handleProceedQuestion}
                        style={{
                          ...BTN,
                          background: currentQ < questionsList.length - 1 ? CYAN : GREEN,
                          color: '#fff',
                          border: 'none',
                          padding: '12px 24px'
                        }}
                      >
                        {currentQ < questionsList.length - 1 ? (
                          <>Save Answer & Next Question <ArrowRight size={15} /></>
                        ) : (
                          <>🏁 Save & Finalize Interview</>
                        )}
                      </button>
                    </div>
                  </GlowCard>

                  {/* Previous Questions Summary Drawer */}
                  {transcript.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                        Saved Responses ({transcript.length} / {questionsList.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {transcript.map((t, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--bg-card-high)', borderRadius: 8, fontSize: 12 }}>
                            <span style={{ color: GREEN, fontWeight: 800 }}>Q{idx + 1} ✓</span>
                            <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.answer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SCREEN 3: COMPREHENSIVE PERFORMANCE RESULTS & MODEL ANSWERS
          ───────────────────────────────────────────────────────────── */}
          {phase === 'result' && (
            <div style={{ maxWidth: 980, margin: '0 auto' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 40, margin: '0 0 6px' }}>
                  {(result?.overallScore || 0) >= 80 ? '🏆' : (result?.overallScore || 0) >= 65 ? '⚡' : (result?.overallScore || 0) >= 45 ? '🛠️' : '📈'}
                </p>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Comprehensive Interview Evaluation & Assessment Report
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Track: <strong style={{ color: CYAN }}>{result?.track}</strong> · Duration: {fmt(result?.duration || 0)} · Words Evaluated: <strong>{result?.totalWords || 0}</strong>
                </p>
              </div>

              {/* Overall Placement Readiness Verdict Banner */}
              <GlowCard accent={result?.readinessColor || (result?.overallScore >= 75 ? GREEN : AMBER)} padding={24} style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 130, height: 130, borderRadius: '50%', background: `conic-gradient(${result?.readinessColor || (result?.overallScore >= 75 ? GREEN : AMBER)} ${(result?.overallScore || 0) * 3.6}deg, var(--bg-card-high) 0)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: `0 0 24px ${result?.readinessColor || GREEN}33` }}>
                      <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-primary)' }}>{result?.overallScore}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      Grade: <span style={{ color: result?.readinessColor || GREEN }}>{result?.grade}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${result?.readinessColor || GREEN}18`, color: result?.readinessColor || GREEN, marginTop: 4, display: 'inline-block' }}>
                      {result?.readinessBadge || 'Evaluated'}
                    </span>
                  </div>

                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                        Placement Readiness Verdict
                      </span>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {result?.readinessVerdict}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                        Total Words Spoken: <strong>{result?.totalWords || 0}</strong> · Average Pace: <strong>{result?.avgWpm || 0} WPM</strong> · Fillers Detected: <strong>{result?.totalFillers || 0}</strong>
                      </p>
                    </div>

                    {/* 6 Key Competencies Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                      {[
                        { l: 'Topical Relevance', v: result?.relevanceScore,  c: VIOLET, desc: 'Key concept coverage (40%)' },
                        { l: 'Content Depth',    v: result?.contentScore,    c: CYAN,   desc: 'Substance & length (25%)' },
                        { l: 'STAR Structure',   v: result?.structureScore,  c: BLUE,   desc: 'Logical sequencing (15%)' },
                        { l: 'Spoken Fluency',   v: result?.fluencyScore,    c: GREEN,  desc: 'Filler minimization (10%)' },
                        { l: 'Confidence',       v: result?.confidenceScore, c: AMBER,  desc: 'Assertive phrasing (10%)' },
                        { l: 'Eye Contact',      v: result?.eyeContactScore, c: TEAL,   desc: 'Proctoring camera index' },
                      ].map(m => (
                        <div key={m.l} style={{ padding: '10px 12px', background: `${m.c}0a`, border: `1px solid ${m.c}25`, borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{m.l}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: m.c }}>{m.v}%</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--bg-card-high)', borderRadius: 2, marginBottom: 4 }}>
                            <div style={{ width: `${Math.min(100, m.v || 0)}%`, height: '100%', background: m.c, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{m.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* AI Feedback Cards */}
              <GlowCard title="AI Speech & Delivery Coaching" accent={CYAN} padding={20} style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: GREEN, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={15} /> Key Strengths
                    </h4>
                    {result?.feedback?.strengths?.map((s, i) => (
                      <p key={i} style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, borderLeft: `2px solid ${GREEN}`, lineHeight: 1.6 }}>
                        {s}
                      </p>
                    ))}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: AMBER, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={15} /> High-Impact Improvements
                    </h4>
                    {result?.feedback?.improvements?.map((s, i) => (
                      <p key={i} style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, borderLeft: `2px solid ${AMBER}`, lineHeight: 1.6 }}>
                        {s}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Practical Delivery Tips */}
                {result?.feedback?.tips?.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: CYAN, marginBottom: 8 }}>
                      💡 Speech Pacing & Delivery Coach
                    </div>
                    {result?.feedback?.tips?.map((tip, i) => (
                      <p key={i} style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </GlowCard>

              {/* Question-by-Question Breakdown with Model Answers */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      Question-by-Question Deep Evaluation Review
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Granular breakdown of concepts covered, omitted concepts, and constructive AI critique.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>
                    {answerScores.length} Questions Answered
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {answerScores.map((sc, i) => (
                    <div key={i} style={{ background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                      {/* Question Title & Score Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', flex: 1, lineHeight: 1.5 }}>
                          Q{i + 1}: {sc.question}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, padding: '4px 10px', borderRadius: 8, background: `${sc.verdictColor || CYAN}18`, border: `1px solid ${sc.verdictColor || CYAN}40`, color: sc.verdictColor || CYAN }}>
                            {sc.score !== undefined ? `${sc.score} / 100` : `${sc.relevanceScore}%`} · {sc.verdict || 'Evaluated'}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>Weight: 40% Relevance · 25% Depth</span>
                        </div>
                      </div>

                      {/* Mini Metric Bars */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14, background: 'var(--bg-base)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Relevance</span>
                          <strong style={{ fontSize: 13, color: VIOLET }}>{sc.relevanceScore}%</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Content Depth</span>
                          <strong style={{ fontSize: 13, color: CYAN }}>{sc.contentScore || sc.lengthScore || 0}% ({sc.wordCount} words)</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>STAR Structure</span>
                          <strong style={{ fontSize: 13, color: BLUE }}>{sc.structureScore}%</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Fluency / Pace</span>
                          <strong style={{ fontSize: 13, color: GREEN }}>{sc.fluencyScore}% ({sc.wpm} WPM)</strong>
                        </div>
                      </div>

                      {/* Concepts Covered vs Missed Badges */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, marginRight: 4 }}>Concepts Covered:</span>
                          {(sc.conceptsHit && sc.conceptsHit.length > 0) ? (
                            sc.conceptsHit.map(c => (
                              <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(22,163,74,0.15)', border: `1px solid ${GREEN}40`, color: GREEN }}>
                                ✓ {c}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>No technical keywords detected in this answer</span>
                          )}
                        </div>

                        {(sc.conceptsMissed && sc.conceptsMissed.length > 0) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: AMBER, marginRight: 4 }}>Key Concepts Omitted:</span>
                            {sc.conceptsMissed.map(c => (
                              <span key={c} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(217,119,6,0.1)', border: `1px solid ${AMBER}30`, color: AMBER }}>
                                ○ {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Constructive AI Critique */}
                      {sc.critique && (
                        <div style={{ background: 'rgba(79,70,229,0.06)', borderLeft: `3px solid ${sc.verdictColor || CYAN}`, borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: sc.verdictColor || CYAN, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                            🎯 AI Evaluation Feedback:
                          </span>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {sc.critique}
                          </p>
                        </div>
                      )}

                      {/* Student's Transcribed Answer */}
                      <div style={{ marginBottom: 10, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          Your Spoken Response ({sc.wordCount} words):
                        </span>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: sc.answer === '(No response recorded)' ? 'italic' : 'normal' }}>
                          "{sc.answer}"
                        </p>
                      </div>

                      {/* Exemplary Model Answer / STAR Approach */}
                      {sc.modelAnswer && (
                        <div style={{ background: 'rgba(16,185,129,0.05)', border: `1px solid ${GREEN}25`, borderRadius: 8, padding: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            💡 Exemplary Benchmark & STAR Model Answer:
                          </span>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {sc.modelAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={resetAll}
                  style={{ ...BTN, background: CYAN, color: '#fff', border: 'none', padding: '12px 24px' }}
                >
                  <RefreshCw size={15} /> Practice Another Track
                </button>
                <button
                  onClick={copyAssessmentSummary}
                  style={{ ...BTN, background: 'rgba(79,70,229,0.1)', color: CYAN, border: `1px solid ${CYAN}40`, padding: '12px 24px' }}
                >
                  <Copy size={15} /> Copy Assessment Summary
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setPhase('setup'); }}
                  style={{ ...BTN, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '12px 24px' }}
                >
                  <History size={15} /> View Performance History
                </button>
              </div>

              {saving && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 12 }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving evaluation session...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BTN = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
  transition: 'all 0.15s ease'
};

function MetricBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(value || 0)}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-card-high)', borderRadius: 3 }}>
        <div style={{ width: `${value || 0}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}