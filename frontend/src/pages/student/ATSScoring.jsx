// src/pages/student/ATSScoring.jsx
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GlowCard from '../../components/GlowCard';
import {
  CheckCircle, XCircle, Zap, FileText,
  Upload, X, Loader2, Target, Award,
  Copy, Check, Sparkles, ShieldCheck,
  AlertTriangle, Lightbulb, FileEdit,
  RotateCcw, Download, Plus, TrendingUp
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const CYAN   = '#4f46e5',
      GREEN  = '#16a34a',
      AMBER  = '#d97706',
      RED    = '#dc2626',
      VIOLET = '#4f46e5',
      BLUE   = '#2563eb';

// ── Stop words ──────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','in','on','at','for','with','and','or','to','of',
  'is','are','was','were','be','been','have','has','will','would',
  'should','can','this','that','they','you','we','it','as','by',
  'from','but','not','our','your','their','its','also','more',
  'than','about','into','through','during','before','after','above',
  'below','between','each','such','when','while','although','however',
  'including','across','under','within','without','per','via','able',
  'must','shall','etc','using','used','use','plus','well','both','all',
]);

// ── Robust Skill Word/Phrase Matcher ─────────────────────────────────────────
function matchSkillInText(skill, text) {
  if (!skill || !text) return false;
  const s = skill.toLowerCase().trim();
  const t = text.toLowerCase();

  // If skill contains special characters like ++, #, /, .
  if (/[+#/.]/.test(s)) {
    const escaped = s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp('(^|[^a-zA-Z0-9])' + escaped + '([^a-zA-Z0-9]|$)', 'i').test(t);
  }
  return new RegExp('\\b' + s + '\\b', 'i').test(t);
}

// ── Skill categories for structured diagnosis ───────────────────────────────
const SKILL_CATEGORIES = {
  languages: {
    label: 'Programming Languages',
    skills: [
      'python','java','javascript','typescript','c++','c#','golang','rust',
      'ruby','php','swift','kotlin','sql','html','css','scala','r','dart','bash','shell'
    ]
  },
  frameworks: {
    label: 'Frameworks & Libraries',
    skills: [
      'react','angular','vue','next.js','node.js','express',
      'spring boot','spring','django','flask','fastapi','tailwind','bootstrap',
      'redux','pytorch','tensorflow','pandas','numpy','scikit','graphql'
    ]
  },
  cloudDevops: {
    label: 'Cloud, DevOps & Databases',
    skills: [
      'aws','azure','gcp','docker','kubernetes','jenkins','git','github','gitlab',
      'linux','ci/cd','terraform','postgresql','mongodb',
      'redis','mysql','sqlite','kafka','firebase','supabase'
    ]
  },
  concepts: {
    label: 'System Design & Concepts',
    skills: [
      'system design','microservices','rest api','restful api','data structures',
      'algorithms','agile','scrum','unit testing','test driven development',
      'cloud computing','machine learning','deep learning','object oriented programming',
      'full stack','devops','api integration','database management'
    ]
  }
};

// ── Multi-word tech phrases ─────────────────────────────────────────────────
const TECH_PHRASES = [
  'machine learning','data structures','system design','rest api','restful api',
  'node.js','react.js','spring boot','deep learning','natural language processing',
  'version control','agile methodology','ci/cd','microservices',
  'cloud computing','object oriented programming','artificial intelligence',
  'data analysis','full stack','front end','back end','devops',
  'unit testing','test driven development','continuous integration',
  'continuous deployment','software development','web development',
  'mobile development','database management','api integration',
  'problem solving','distributed systems','performance optimization',
];

// ── Action Verbs ────────────────────────────────────────────────────────────
const ACTION_VERBS = [
  'developed','engineered','architected','built','designed','implemented',
  'created','managed','led','improved','optimized','reduced','increased',
  'deployed','collaborated','delivered','automated','integrated','scaled',
  'refactored','launched','spearheaded','orchestrated','mentored','resolved'
];

// ── Weak / Passive Phrases to flag ──────────────────────────────────────────
const WEAK_PHRASES = [
  { phrase: 'responsible for', suggestion: 'Spearheaded / Managed / Led' },
  { phrase: 'helped with', suggestion: 'Collaborated on / Engineered' },
  { phrase: 'worked on', suggestion: 'Architected / Developed / Implemented' },
  { phrase: 'assisted in', suggestion: 'Contributed to / Executed' },
  { phrase: 'handled', suggestion: 'Orchestrated / Resolved / Streamlined' },
  { phrase: 'participated in', suggestion: 'Drove / Spearheaded' },
  { phrase: 'tasked with', suggestion: 'Owned and executed / Delivered' },
];

// ── Seniority terms ─────────────────────────────────────────────────────────
const SENIORITY_TERMS = {
  junior: ['junior','entry level','entry-level','fresher','graduate','0-1','0-2','1 year','intern'],
  mid:    ['mid level','mid-level','2-3','2-4','3 years','3-5','intermediate','associate'],
  senior: ['senior','lead','principal','5+','5 years','7 years','expert','architect','staff'],
};

// ── Quick Sample Job Descriptions for testing ──────────────────────────────
const SAMPLE_JDS = [
  {
    title: 'Full Stack Engineer',
    badge: 'MERN / PERN',
    text: `Job Title: Full Stack Software Engineer (React / Node.js)
Experience Level: Fresher to 2 years

Responsibilities:
• Architect, develop, and maintain responsive web applications using React.js, TypeScript, and Tailwind CSS.
• Design and implement scalable RESTful APIs and microservices using Node.js, Express, and PostgreSQL.
• Implement Redis caching to optimize database queries and decrease API latency.
• Configure CI/CD automated deployment pipelines with GitHub Actions and Docker.
• Write comprehensive unit testing and integration tests with Jest.
• Collaborate within an Agile/Scrum environment with system design principles and Git version control.

Required Skills:
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, Redis, Docker, Git, REST API, Microservices, System Design, Unit Testing, AWS, CI/CD.`
  },
  {
    title: 'ML / Data Scientist',
    badge: 'Python / PyTorch',
    text: `Job Title: Junior Machine Learning Engineer / Data Scientist
Experience Level: Fresher to 2 years

Responsibilities:
• Develop, train, and validate predictive machine learning models and deep learning architectures using PyTorch and TensorFlow.
• Perform data preprocessing, feature engineering, and data analysis using Python, Pandas, NumPy, and Scikit-Learn.
• Build natural language processing (NLP) pipelines and deploy models as REST API endpoints with FastAPI.
• Manage model versioning, Docker containerization, and cloud deployment on AWS or GCP.
• Optimize model inference latency and compute resources.

Required Skills:
Python, SQL, PyTorch, TensorFlow, Pandas, NumPy, Scikit-Learn, Machine Learning, Deep Learning, Natural Language Processing, REST API, Docker, AWS, Git.`
  },
  {
    title: 'DevOps / Cloud Engineer',
    badge: 'Docker / K8s / AWS',
    text: `Job Title: Cloud & DevOps Engineer
Experience Level: 1 to 3 years

Responsibilities:
• Build and manage automated CI/CD pipelines using GitHub Actions, Jenkins, and Docker.
• Orchestrate containerized microservices deployments with Kubernetes on AWS (EKS, EC2, S3).
• Provision and manage infrastructure-as-code using Terraform and Linux shell scripting.
• Implement system monitoring, log aggregation, and alerting with Prometheus and Grafana.
• Ensure cloud security, high availability, and database management for PostgreSQL and Redis.

Required Skills:
Linux, Bash, Docker, Kubernetes, AWS, Terraform, CI/CD, Jenkins, Git, PostgreSQL, Redis, Python, System Design, Agile.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
//  ATS COMPATIBILITY ENGINE (Dynamic & Calibrated)
// ═══════════════════════════════════════════════════════════════════════════
function analyzeATS(resumeText, jd) {
  const clean = (t) => (t || '').toLowerCase().replace(/['’]/g, '');
  const resumeLow = clean(resumeText);
  const jdLow     = clean(jd);

  // ── Tokenizer ───────────────────────────────────────────────────────────
  const tokenize = (text) =>
    text.toLowerCase()
        .replace(/[^\w\s+#.-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const resumeTokens = tokenize(resumeText);
  const jdTokens     = [...new Set(tokenize(jd))];

  // ── 1. Categorized Technical Skills Analysis (35 pts max) ───────────────
  const categoryResults = {};
  let totalCatJdSkills = 0;
  let totalCatMatchedSkills = 0;
  const missingSkillsList = [];
  const matchedSkillsList = [];

  Object.entries(SKILL_CATEGORIES).forEach(([catKey, cat]) => {
    const jdSkills = cat.skills.filter(s => matchSkillInText(s, jdLow));
    const matched  = jdSkills.filter(s => matchSkillInText(s, resumeLow));
    const missing  = jdSkills.filter(s => !matchSkillInText(s, resumeLow));

    totalCatJdSkills += jdSkills.length;
    totalCatMatchedSkills += matched.length;

    missingSkillsList.push(...missing);
    matchedSkillsList.push(...matched);

    categoryResults[catKey] = {
      label: cat.label,
      jdSkills,
      matched,
      missing,
      pct: jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 100
    };
  });

  const techSkillsScore = totalCatJdSkills > 0
    ? (totalCatMatchedSkills / totalCatJdSkills) * 35
    : 25;

  // ── 2. Quantifiable Impact & Metrics (15 pts max) ───────────────────────
  const metricRegex = /(\d+(?:\.\d+)?%|\d+x|\$\d+[\d,kmb]*|\b\d{2,}\+?\s*(?:users|clients|requests|ms|seconds|million|thousand|tb|gb|records|downloads|dollars)\b)/gi;
  const metricsFound = resumeText.match(metricRegex) || [];
  // 0 metrics = 3 pts, 1 = 6 pts, 2 = 9 pts, 3 = 12 pts, 4+ = 15 pts
  const impactScore = Math.min(15, 3 + metricsFound.length * 3);

  // ── 3. Action Verbs & Active Voice (15 pts max) ─────────────────────────
  const usedVerbs = ACTION_VERBS.filter(v => resumeLow.includes(v));
  const detectedWeakPhrases = WEAK_PHRASES.filter(w => resumeLow.includes(w.phrase));

  let verbBaseScore = Math.min(15, Math.round((usedVerbs.length / 8) * 15));
  // Deduct 2 pts per weak phrase penalty (min 3 pts)
  const powerVerbScore = Math.max(3, verbBaseScore - detectedWeakPhrases.length * 2);

  // ── 4. Tech Phrases & Concepts Match (15 pts max) ───────────────────────
  const jdPhrases      = TECH_PHRASES.filter(p => matchSkillInText(p, jdLow));
  const matchedPhrases = jdPhrases.filter(p => matchSkillInText(p, resumeLow));
  const missingPhrases = jdPhrases.filter(p => !matchSkillInText(p, resumeLow));

  const phraseScore = jdPhrases.length > 0
    ? (matchedPhrases.length / jdPhrases.length) * 15
    : 10;

  // ── 5. Overall Keyword Overlap (10 pts max) ─────────────────────────────
  const matchedKeywords = jdTokens.filter(w => resumeTokens.includes(w));
  const missingKeywords = jdTokens.filter(w => !resumeTokens.includes(w));

  const keywordScore = jdTokens.length > 0
    ? (matchedKeywords.length / jdTokens.length) * 10
    : 6;

  // ── 6. Section Completeness & Format Health (10 pts max) ────────────────
  const sections = {
    hasContact:        /email|phone|linkedin|github|@|\+91|\+1/i.test(resumeText),
    hasSummary:        /summary|objective|about me|professional profile/i.test(resumeText),
    hasEducation:      /education|degree|university|college|bachelor|master|b\.tech|m\.tech|b\.e|cgpa|gpa/i.test(resumeText),
    hasExperience:     /experience|internship|employment|work history/i.test(resumeText),
    hasSkills:         /skills|technologies|technical stack|tools|proficiencies/i.test(resumeText),
    hasProjects:       /project|github\.com|portfolio/i.test(resumeText),
    hasCertifications: /certification|certificate|certified|coursera|udemy|aws certified|license/i.test(resumeText),
  };

  const sectionCount = Object.values(sections).filter(Boolean).length;
  const structuralScore = Math.min(10, Math.round((sectionCount / 7) * 10));

  // ── Seniority Fit Detection ─────────────────────────────────────────────
  let detectedJdLevel = 'Not Specified';
  for (const [level, terms] of Object.entries(SENIORITY_TERMS)) {
    if (terms.some(t => jdLow.includes(t))) {
      detectedJdLevel = level.toUpperCase();
      break;
    }
  }

  // ── Total Score Calculation ─────────────────────────────────────────────
  const rawScore = techSkillsScore + impactScore + powerVerbScore + phraseScore + keywordScore + structuralScore;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+'
              : score >= 60 ? 'B'  : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F';

  const passProbability = score >= 85 ? 95
                        : score >= 75 ? 85
                        : score >= 65 ? 70
                        : score >= 50 ? 50 : 30;

  // ── Tailored Bullet Point Rewrites (X-Y-Z Formula Generator) ────────────
  const tailoredRewrites = [];
  const cleanMissingSkills = [...new Set(missingSkillsList)];

  if (cleanMissingSkills.some(s => ['docker', 'kubernetes'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Docker / Containerization',
      template: 'Containerized multi-tier web services using Docker, standardizing development environments and reducing deployment build time by 45%.'
    });
  }
  if (cleanMissingSkills.some(s => ['ci/cd', 'jenkins', 'github'].includes(s))) {
    tailoredRewrites.push({
      skill: 'CI/CD Pipelines',
      template: 'Engineered automated CI/CD deployment pipelines using GitHub Actions, slashing release cycle duration from 2 days to under 15 minutes.'
    });
  }
  if (cleanMissingSkills.some(s => ['redis'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Redis Caching',
      template: 'Architected Redis in-memory caching layer for high-frequency database read operations, lowering server response latency by 60%.'
    });
  }
  if (cleanMissingSkills.some(s => ['postgresql', 'mongodb', 'mysql', 'sql'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Database Optimization',
      template: 'Optimized relational schema indexing and query execution paths in PostgreSQL, improving throughput to support 15,000+ daily transactions.'
    });
  }
  if (cleanMissingSkills.some(s => ['system design', 'microservices', 'rest api', 'restful api'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Microservices & System Design',
      template: 'Architected scalable RESTful microservices architecture handling 50k+ daily API requests with 99.9% uptime.'
    });
  }
  if (cleanMissingSkills.some(s => ['unit testing', 'test driven development'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Unit Testing & Quality Assurance',
      template: 'Authored comprehensive unit and integration test suites with Jest, increasing test coverage from 42% to 88% and eliminating critical regressions.'
    });
  }
  if (cleanMissingSkills.some(s => ['machine learning', 'deep learning', 'pytorch', 'tensorflow'].includes(s))) {
    tailoredRewrites.push({
      skill: 'Machine Learning Models',
      template: 'Trained and fine-tuned predictive machine learning models in PyTorch, attaining 93.8% F1-score across a dataset of 120,000+ samples.'
    });
  }

  // Fallback template
  if (tailoredRewrites.length === 0) {
    tailoredRewrites.push({
      skill: 'Quantified Feature Delivery',
      template: 'Engineered high-performance user-facing modules using modern component architectures, increasing user task completion speed by 35%.'
    });
  }

  // ── Categorized Diagnostic Suggestions ──────────────────────────────────
  const suggestions = {
    critical: [],
    recommended: [],
    polishing: []
  };

  if (cleanMissingSkills.length > 0) {
    suggestions.critical.push({
      title: 'Missing Core Technical Skills',
      desc: `The job description explicitly mentions: ${cleanMissingSkills.slice(0, 6).join(', ')}. Click '+ Apply' below to add them directly into your skills section.`,
      action: 'Add to Skills & Projects'
    });
  }
  if (!sections.hasSkills) {
    suggestions.critical.push({
      title: 'Missing Dedicated Skills Header',
      desc: 'ATS parsers look for standard headers like "Technical Skills". Click to insert a pre-formatted skills section.',
      action: 'Create "Technical Skills" Header'
    });
  }
  if (!sections.hasContact) {
    suggestions.critical.push({
      title: 'Missing Contact Details',
      desc: 'ATS could not detect complete contact info (Email, Phone, LinkedIn, GitHub). Ensure these are placed in plain text at the very top.',
      action: 'Add Plaintext Header'
    });
  }

  if (metricsFound.length < 3) {
    suggestions.recommended.push({
      title: 'Quantify Achievements (Google X-Y-Z Formula)',
      desc: `Only ${metricsFound.length} measurable metric(s) found. Click '⚡ + Apply to Resume' on our tailored bullet points to insert quantified achievements.`,
      action: 'Add Metrics & Percentages'
    });
  }
  if (missingPhrases.length > 0) {
    suggestions.recommended.push({
      title: 'Incorporate Target Role Architecture Phrases',
      desc: `Include key engineering phrases requested in JD: "${missingPhrases.slice(0, 4).join('", "')}".`,
      action: 'Integrate Phrases'
    });
  }

  if (detectedWeakPhrases.length > 0) {
    suggestions.polishing.push({
      title: 'Eliminate Passive / Weak Expressions',
      desc: `Found passive phrasing: "${detectedWeakPhrases.map(w => w.phrase).join('", "')}". Click '⚡ Auto-Replace' to swap with power verbs.`,
      action: 'Replace Passive Verbs'
    });
  }

  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;

  // ── Score Breakdown Bars ────────────────────────────────────────────────
  const breakdown = [
    {
      label: 'Core Technical Skills',
      detail: `${totalCatMatchedSkills}/${totalCatJdSkills} required skills matched`,
      score: Math.round(techSkillsScore),
      max: 35,
      color: VIOLET,
      pct: totalCatJdSkills > 0 ? Math.round((totalCatMatchedSkills / totalCatJdSkills) * 100) : 100
    },
    {
      label: 'Quantifiable Impact & Metrics',
      detail: `${metricsFound.length} metrics & % improvements detected`,
      score: impactScore,
      max: 15,
      color: GREEN,
      pct: Math.round((impactScore / 15) * 100)
    },
    {
      label: 'Power Verbs & Active Voice',
      detail: `${usedVerbs.length} power verbs (${detectedWeakPhrases.length} passive flagged)`,
      score: powerVerbScore,
      max: 15,
      color: '#06b6d4',
      pct: Math.round((powerVerbScore / 15) * 100)
    },
    {
      label: 'Architecture & Tech Phrases',
      detail: `${matchedPhrases.length}/${jdPhrases.length} industry phrases matched`,
      score: Math.round(phraseScore),
      max: 15,
      color: CYAN,
      pct: jdPhrases.length > 0 ? Math.round((matchedPhrases.length / jdPhrases.length) * 100) : 100
    },
    {
      label: 'Job Description Keywords',
      detail: `${matchedKeywords.length}/${jdTokens.length} unique keywords found`,
      score: Math.round(keywordScore),
      max: 10,
      color: BLUE,
      pct: jdTokens.length > 0 ? Math.round((matchedKeywords.length / jdTokens.length) * 100) : 0
    },
    {
      label: 'Section Structure & Format Health',
      detail: `${sectionCount}/7 key resume sections verified`,
      score: structuralScore,
      max: 10,
      color: '#8b5cf6',
      pct: Math.round((structuralScore / 10) * 100)
    }
  ];

  return {
    score,
    grade,
    passProbability,
    wordCount,
    matchedKeywords,
    missingKeywords: missingKeywords.filter(w => w.length > 3).slice(0, 25),
    matchedPhrases,
    missingPhrases,
    matchedSkillsList,
    missingSkillsList: cleanMissingSkills,
    categoryResults,
    usedVerbs,
    detectedWeakPhrases,
    metricsFound,
    sections,
    suggestions,
    tailoredRewrites,
    breakdown,
    detectedJdLevel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  PDF TEXT EXTRACTOR (Client-Side)
// ═══════════════════════════════════════════════════════════════════════════
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let   fullText    = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text    = content.items.map(item => item.str).join(' ');
    fullText      += text + '\n';
  }

  return fullText.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORMATTED RESUME PDF GENERATOR (Preserves Executive Structure)
// ═══════════════════════════════════════════════════════════════════════════
function generateFormattedResumePDF(resumeText, style = 'classic') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 15, CW = W - M * 2;
  let y = 18;

  const checkPage = (needed = 10) => {
    if (y + needed > H - 15) { doc.addPage(); y = 18; }
  };

  const accentColor = style === 'classic'
    ? [26, 54, 93]    // Classic Corporate Navy
    : style === 'modern'
    ? [79, 70, 229]   // Modern Tech Indigo
    : [45, 55, 72];   // Minimal Executive Graphite

  const lines = resumeText.split('\n');
  const headerRegex = /^(?:professional\s+)?(?:summary|profile|objective|technical\s+skills|skills|work\s+experience|experience|employment|projects|featured\s+projects|education|certifications|achievements|awards)[\s:]*$/i;

  let inHeader = true;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { y += 2.5; continue; }

    const isHeader = headerRegex.test(line.replace(/[:#*-]/g, '').trim()) && line.length < 40;

    if (isHeader) {
      inHeader = false;
      checkPage(14);
      y += 3;
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...accentColor);
      doc.text(line.replace(/[:#*-]/g, '').trim().toUpperCase(), M, y);
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);
      continue;
    }

    if (inHeader) {
      if (y === 18) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(...accentColor);
        doc.text(line, W / 2, y, { align: 'center' });
        y += 7;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const contactLines = doc.splitTextToSize(line, CW);
        for (const cl of contactLines) {
          doc.text(cl, W / 2, y, { align: 'center' });
          y += 4.5;
        }
      }
      continue;
    }

    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('▸');
    const isCategory = /^(?:languages|frameworks|tools|databases|cloud|web|core)\s*:/i.test(line);

    if (isBullet) {
      const bulletText = line.replace(/^[-•*▸]\s*/, '').trim();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(bulletText, CW - 6);
      for (let idx = 0; idx < wrapped.length; idx++) {
        const wl = wrapped[idx];
        checkPage(5.5);
        if (idx === 0) {
          doc.text('•', M + 1, y);
        }
        doc.text(wl, M + 6, y);
        y += 5;
      }
    } else if (isCategory) {
      checkPage(6);
      const colonIdx = line.indexOf(':');
      const catTitle = line.slice(0, colonIdx + 1);
      const catValues = line.slice(colonIdx + 1);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...accentColor);
      doc.text(catTitle, M, y);
      const titleW = doc.getTextWidth(catTitle) + 2;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(catValues.trim(), CW - titleW);
      for (let idx = 0; idx < wrapped.length; idx++) {
        const wl = wrapped[idx];
        if (idx === 0) {
          doc.text(wl, M + titleW, y);
          y += 5;
        } else {
          checkPage(5);
          doc.text(wl, M + 6, y);
          y += 5;
        }
      }
    } else {
      const isSubheader = line.includes('|') || line.includes('@') || line.includes('(20') || line.length < 50;
      doc.setFont('helvetica', isSubheader ? 'bold' : 'normal');
      doc.setFontSize(isSubheader ? 10 : 9.5);
      doc.setTextColor(isSubheader ? 30 : 60, isSubheader ? 41 : 65, isSubheader ? 59 : 81);
      const wrapped = doc.splitTextToSize(line, CW);
      for (const wl of wrapped) {
        checkPage(5.5);
        doc.text(wl, M, y);
        y += isSubheader ? 5.5 : 5;
      }
    }
  }

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN ATS SCORING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ATSScoring() {
  const navigate = useNavigate();

  // Resume state
  const [resume,        setResume]        = useState('');
  const [inputMode,     setInputMode]     = useState('paste'); // 'paste' | 'pdf'
  const [pdfFile,       setPdfFile]       = useState(null);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [dragging,      setDragging]      = useState(false);
  const fileInputRef                      = useRef(null);

  // Job Description state
  const [jd,            setJD]            = useState('');
  const [jdInputMode,   setJdInputMode]   = useState('paste'); // 'paste' | 'pdf'
  const [jdPdfFile,     setJdPdfFile]     = useState(null);
  const [jdPdfLoading,  setJdPdfLoading]  = useState(false);
  const [jdDragging,    setJdDragging]    = useState(false);
  const jdFileInputRef                    = useRef(null);

  // Analysis & Evolution State
  const [result,         setResult]         = useState(null);
  const [analyzing,      setAnalyzing]      = useState(false);
  const [isRecalculating,setIsRecalculating]= useState(false);
  const [activeTab,      setActiveTab]      = useState('overview');
  const [copiedSkill,    setCopiedSkill]    = useState(null);
  const [originalResume, setOriginalResume] = useState('');
  const [initialScore,   setInitialScore]   = useState(null);
  const [lastScore,      setLastScore]      = useState(null);
  const [appliedItems,   setAppliedItems]   = useState(new Set());
  const [showLiveEditor, setShowLiveEditor] = useState(false);
  const [selectedStyle,  setSelectedStyle]  = useState('classic'); // 'classic' | 'modern' | 'minimal'

  // ── Copy to Clipboard helper ─────────────────────────────────────────────
  const copyText = (text, label) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedSkill(label || text);
    toast.success(`Copied "${label || text}" to clipboard!`);
    setTimeout(() => setCopiedSkill(null), 2000);
  };

  // ── Resume PDF Handler ───────────────────────────────────────────────────
  const handlePDF = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('PDF must be under 8MB');
      return;
    }

    setPdfFile(file);
    setPdfLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 50) {
        toast.error('Could not extract text from PDF. It may be image-scanned. Try pasting text.');
        setPdfFile(null);
        return;
      }
      setResume(text);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      toast.success(`Extracted ${wordCount} words from Resume PDF!`);
    } catch (err) {
      console.error('Resume PDF extract error:', err);
      toast.error('Failed to read Resume PDF. Please paste text directly.');
      setPdfFile(null);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // ── JD PDF Handler ───────────────────────────────────────────────────────
  const handleJdPDF = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF file for Job Description');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Job Description PDF must be under 8MB');
      return;
    }

    setJdPdfFile(file);
    setJdPdfLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 50) {
        toast.error('Could not extract text from Job Description PDF. Try pasting text.');
        setJdPdfFile(null);
        return;
      }
      setJD(text);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      toast.success(`Extracted ${wordCount} words from Job Description PDF!`);
    } catch (err) {
      console.error('JD PDF extract error:', err);
      toast.error('Failed to read Job Description PDF. Please paste text directly.');
      setJdPdfFile(null);
    } finally {
      setJdPdfLoading(false);
    }
  }, []);

  // ── Drag & Drop Handlers ─────────────────────────────────────────────────
  const onResumeDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePDF(file);
  }, [handlePDF]);

  const onJdDrop = useCallback((e) => {
    e.preventDefault();
    setJdDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleJdPDF(file);
  }, [handleJdPDF]);

  // ── Clear Handlers ───────────────────────────────────────────────────────
  const clearResume = () => {
    setResume('');
    setPdfFile(null);
    setOriginalResume('');
    setInitialScore(null);
    setLastScore(null);
    setAppliedItems(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('Resume cleared', { icon: '🧹' });
  };

  const clearJD = () => {
    setJD('');
    setJdPdfFile(null);
    if (jdFileInputRef.current) jdFileInputRef.current.value = '';
    toast('Job description cleared', { icon: '🧹' });
  };

  // ── Quick Load Sample JD ─────────────────────────────────────────────────
  const loadSampleJD = (sample) => {
    setJD(sample.text);
    setJdInputMode('paste');
    setJdPdfFile(null);
    toast.success(`Loaded sample: ${sample.title}`);
  };

  // ── Analyze Action ───────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!resume.trim() || !jd.trim()) {
      toast.error('Please provide both your Resume and the Job Description');
      return;
    }
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 350));
    const analysis = analyzeATS(resume, jd);
    if (!originalResume) setOriginalResume(resume);
    if (initialScore === null) setInitialScore(analysis.score);
    setLastScore(analysis.score);
    setResult(analysis);
    setAnalyzing(false);
    toast.success(`ATS Compatibility: ${analysis.score}/100 (Grade: ${analysis.grade})`);
  };

  // ── Re-Score Function (Handles visual delta & feedback) ───────────────────
  const reScoreNow = async (explicitText = null) => {
    const textToScore = explicitText !== null ? explicitText : resume;
    if (!textToScore.trim() || !jd.trim()) {
      toast.error('Resume or Job Description is empty');
      return;
    }

    setIsRecalculating(true);
    await new Promise(r => setTimeout(r, 200));

    const currentScore = result ? result.score : 0;
    const newAnalysis = analyzeATS(textToScore, jd);

    setLastScore(currentScore);
    setResult(newAnalysis);
    setIsRecalculating(false);

    const diff = newAnalysis.score - currentScore;
    if (diff > 0) {
      toast.success(`🎉 Score upgraded: ${currentScore} ➔ ${newAnalysis.score} (+${diff} pts)!`);
    } else if (diff < 0) {
      toast(`Score updated: ${currentScore} ➔ ${newAnalysis.score} (${diff} pts)`, { icon: '📊' });
    } else {
      toast(`Score evaluated: ${newAnalysis.score}/100. Tip: Add missing keywords from Tab 2 to increase points!`, { icon: 'ℹ️' });
    }
  };

  // ── DIRECT SUGGESTION IMPLICATIONS (1-CLICK APPLY) ─────────────────────────

  // 1. Apply single missing skill
  const applySkill = (skill) => {
    const cleanSkill = skill.trim();
    if (!cleanSkill) return;

    let updatedResume = resume;
    const skillsRegex = /(?:technical\s+|core\s+)?skills(?:\s*:\s*|\s*\n)/i;
    const match = updatedResume.match(skillsRegex);

    if (match) {
      const insertPos = match.index + match[0].length;
      updatedResume = updatedResume.slice(0, insertPos) + `${cleanSkill}, ` + updatedResume.slice(insertPos);
    } else {
      updatedResume = updatedResume + `\n\nTECHNICAL SKILLS\nSkills: ${cleanSkill}`;
    }

    setResume(updatedResume);
    setInputMode('paste');
    setAppliedItems(prev => new Set([...prev, `skill_${cleanSkill}`]));
    reScoreNow(updatedResume);
  };

  // 2. Apply all missing skills at once
  const applyAllMissingSkills = () => {
    if (!result || !result.missingSkillsList.length) return;
    const skillsToAdd = result.missingSkillsList.filter(Boolean);
    if (!skillsToAdd.length) return;

    let updatedResume = resume;
    const skillsRegex = /(?:technical\s+|core\s+)?skills(?:\s*:\s*|\s*\n)/i;
    const match = updatedResume.match(skillsRegex);

    if (match) {
      const insertPos = match.index + match[0].length;
      updatedResume = updatedResume.slice(0, insertPos) + `${skillsToAdd.join(', ')}, ` + updatedResume.slice(insertPos);
    } else {
      updatedResume = updatedResume + `\n\nTECHNICAL SKILLS\nSkills: ${skillsToAdd.join(', ')}`;
    }

    setResume(updatedResume);
    setInputMode('paste');
    const newSet = new Set(appliedItems);
    skillsToAdd.forEach(s => newSet.add(`skill_${s}`));
    setAppliedItems(newSet);
    reScoreNow(updatedResume);
  };

  // 3. Insert tailored X-Y-Z bullet into Projects/Experience
  const applyBulletRewrite = (template, skillKey) => {
    let updatedResume = resume;
    const projectsRegex = /(?:featured\s+)?projects(?:\s*:\s*|\s*\n)/i;
    const expRegex = /(?:work\s+)?experience(?:\s*:\s*|\s*\n)/i;
    const match = updatedResume.match(projectsRegex) || updatedResume.match(expRegex);

    const bulletLine = `\n• ${template.trim()}\n`;

    if (match) {
      const insertPos = match.index + match[0].length;
      updatedResume = updatedResume.slice(0, insertPos) + bulletLine + updatedResume.slice(insertPos);
    } else {
      updatedResume = updatedResume + `\n\nPROJECTS\n• ${template.trim()}`;
    }

    setResume(updatedResume);
    setInputMode('paste');
    setAppliedItems(prev => new Set([...prev, `bullet_${skillKey}`]));
    reScoreNow(updatedResume);
  };

  // 4. Auto-replace weak/passive phrasing with active power verb
  const applyWeakPhraseFix = (weakPhrase, suggestion) => {
    const bestVerb = suggestion.split('/')[0].trim();
    const regex = new RegExp(`\\b${weakPhrase}\\b`, 'gi');

    if (!regex.test(resume)) {
      toast.error(`"${weakPhrase}" not found in current resume text`);
      return;
    }

    const updatedResume = resume.replace(regex, (matched) => {
      if (matched[0] === matched[0].toUpperCase()) {
        return bestVerb.charAt(0).toUpperCase() + bestVerb.slice(1);
      }
      return bestVerb.toLowerCase();
    });

    setResume(updatedResume);
    setInputMode('paste');
    setAppliedItems(prev => new Set([...prev, `weak_${weakPhrase}`]));
    reScoreNow(updatedResume);
  };

  // 5. Insert missing section template
  const applyMissingSection = (key) => {
    let addition = '';
    let label = '';
    if (key === 'hasSummary') {
      addition = '\n\nPROFESSIONAL SUMMARY\nDedicated software engineer with a strong foundation in computer science and full-stack development, seeking to leverage technical problem-solving skills in high-impact engineering projects.\n';
      label = 'Professional Summary';
    } else if (key === 'hasProjects') {
      addition = '\n\nPROJECTS\nCampus Placement Portal | React, Node.js, PostgreSQL\n• Engineered full-stack web application with secure JWT authentication and role-based access control.\n• Designed scalable RESTful APIs reducing data fetch latency by 35% across 10,000+ active users.\n';
      label = 'Projects';
    } else if (key === 'hasSkills') {
      addition = '\n\nTECHNICAL SKILLS\nLanguages: Python, JavaScript, TypeScript, SQL\nFrameworks: React.js, Node.js, Express, Tailwind CSS\nTools & Cloud: Git, Docker, REST APIs, System Design\n';
      label = 'Technical Skills';
    } else if (key === 'hasCertifications') {
      addition = '\n\nCERTIFICATIONS\n• AWS Certified Cloud Practitioner — Amazon Web Services (2024)\n• Data Structures and Algorithms Specialization — Coursera (2023)\n';
      label = 'Certifications';
    } else if (key === 'hasContact') {
      addition = 'Email: student@smart-hire.edu | Phone: +91 9876543210 | LinkedIn: linkedin.com/in/student | GitHub: github.com/student\n\n';
      const updated = addition + resume;
      setResume(updated);
      setInputMode('paste');
      setAppliedItems(prev => new Set([...prev, `section_${key}`]));
      reScoreNow(updated);
      toast.success(`⚡ Added Contact Info header!`);
      return;
    }

    if (addition) {
      const updated = resume + addition;
      setResume(updated);
      setInputMode('paste');
      setAppliedItems(prev => new Set([...prev, `section_${key}`]));
      reScoreNow(updated);
      toast.success(`⚡ Added ${label} section!`);
    }
  };

  // 6. Revert to original resume
  const resetToOriginal = () => {
    if (!originalResume) return;
    setResume(originalResume);
    setAppliedItems(new Set());
    const restoredAnalysis = analyzeATS(originalResume, jd);
    setResult(restoredAnalysis);
    toast.success('Reverted to original resume');
  };

  // 7. Download updated formatted PDF
  const downloadUpdatedPDF = () => {
    if (!resume.trim()) {
      toast.error('Resume is empty');
      return;
    }
    try {
      const doc = generateFormattedResumePDF(resume, selectedStyle);
      doc.save(`Updated_ATS_Resume_${selectedStyle}.pdf`);
      toast.success(`Downloaded ${selectedStyle.toUpperCase()} format ATS Resume!`);
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  // Color dynamics
  const scoreColor = !result ? CYAN
    : result.score >= 80 ? GREEN
    : result.score >= 60 ? AMBER
    : RED;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color={CYAN} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" }}>
              ATS Resume Match & Scoring Engine
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Upload both your Resume and Job Description via PDF or text. Edit directly, imply suggestions with 1-click, and download in matching executive format.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/student/resume')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.3)',
              borderRadius: 20, color: CYAN, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Sora',sans-serif", transition: 'all 0.15s ease'
            }}
          >
            <FileEdit size={14} /> Open Resume Builder
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 20 }}>
            <ShieldCheck size={14} color={GREEN} />
            <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>100% Client-Side Private Analysis</span>
          </div>
        </div>
      </div>

      {/* ── Input Grid (Resume & Job Description) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, marginBottom: 20 }}>

        {/* 1. RESUME INPUT CARD */}
        <GlowCard
          title="Candidate Resume"
          subtitle="Upload PDF or paste/edit plaintext resume"
          accent={CYAN}
          headerRight={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {resume && (
                <span style={{ fontSize: 11, fontWeight: 700, color: CYAN, background: 'rgba(79,70,229,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  {resume.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
              {resume && (
                <button
                  onClick={clearResume}
                  title="Clear resume"
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          }
        >
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--bg-card-high)', borderRadius: 8, padding: 3 }}>
            {[
              ['paste', '✏️ Paste / Edit Text'],
              ['pdf', '📄 Upload PDF']
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif",
                  background: inputMode === mode ? CYAN : 'transparent',
                  color: inputMode === mode ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* PDF Mode */}
          {inputMode === 'pdf' ? (
            <div>
              <div
                onDrop={onResumeDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? CYAN : 'rgba(79,70,229,0.3)'}`,
                  borderRadius: 12,
                  padding: '28px 16px',
                  textAlign: 'center',
                  cursor: pdfFile ? 'default' : 'pointer',
                  background: dragging ? 'rgba(79,70,229,0.08)' : 'rgba(79,70,229,0.02)',
                  transition: 'all 0.2s ease',
                  marginBottom: 12
                }}
              >
                {pdfLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Loader2 size={30} color={CYAN} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: CYAN }}>Extracting text from Resume PDF...</p>
                  </div>
                ) : pdfFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={24} color={GREEN} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: GREEN }}>{pdfFile.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      {(pdfFile.size / 1024).toFixed(1)} KB · {resume.split(/\s+/).filter(Boolean).length} words parsed
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearResume(); }}
                      style={{
                        marginTop: 6, padding: '5px 12px', background: 'rgba(220,38,38,0.1)',
                        border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6,
                        fontSize: 11, color: RED, cursor: 'pointer', fontWeight: 700
                      }}
                    >
                      Remove & Upload Different PDF
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={30} color={CYAN} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Drag & Drop Resume PDF here or click to browse
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      Standard PDF format · Max 8MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handlePDF(e.target.files[0]); }}
              />

              {/* Extracted Preview */}
              {resume && !pdfLoading && (
                <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 8, padding: '10px 12px', maxHeight: 130, overflowY: 'auto' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Extracted Resume Preview
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {resume.slice(0, 360)}{resume.length > 360 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Paste / Edit Mode */
            <textarea
              value={resume}
              onChange={e => setResume(e.target.value)}
              rows={14}
              placeholder={`Paste your complete resume text here...\n\nInclude:\n• Contact details & links\n• Summary / Objective\n• Technical skills (Languages, Frameworks, Cloud)\n• Work experience / Internships\n• Projects with technologies & measurable impact\n• Education & Certifications`}
              style={TEXTAREA_STYLE}
            />
          )}
        </GlowCard>

        {/* 2. JOB DESCRIPTION INPUT CARD */}
        <GlowCard
          title="Target Job Description"
          subtitle="Upload JD PDF or paste text description"
          accent={AMBER}
          headerRight={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {jd && (
                <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, background: 'rgba(217,119,6,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  {jd.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
              {jd && (
                <button
                  onClick={clearJD}
                  title="Clear Job Description"
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          }
        >
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--bg-card-high)', borderRadius: 8, padding: 3 }}>
            {[
              ['paste', '✏️ Paste Text'],
              ['pdf', '📄 Upload PDF']
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setJdInputMode(mode)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif",
                  background: jdInputMode === mode ? AMBER : 'transparent',
                  color: jdInputMode === mode ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* JD PDF Mode */}
          {jdInputMode === 'pdf' ? (
            <div>
              <div
                onDrop={onJdDrop}
                onDragOver={(e) => { e.preventDefault(); setJdDragging(true); }}
                onDragLeave={() => setJdDragging(false)}
                onClick={() => !jdPdfFile && jdFileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${jdDragging ? AMBER : 'rgba(217,119,6,0.35)'}`,
                  borderRadius: 12,
                  padding: '28px 16px',
                  textAlign: 'center',
                  cursor: jdPdfFile ? 'default' : 'pointer',
                  background: jdDragging ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.02)',
                  transition: 'all 0.2s ease',
                  marginBottom: 12
                }}
              >
                {jdPdfLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Loader2 size={30} color={AMBER} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: AMBER }}>Extracting text from Job Description PDF...</p>
                  </div>
                ) : jdPdfFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={24} color={GREEN} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: GREEN }}>{jdPdfFile.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      {(jdPdfFile.size / 1024).toFixed(1)} KB · {jd.split(/\s+/).filter(Boolean).length} words parsed
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearJD(); }}
                      style={{
                        marginTop: 6, padding: '5px 12px', background: 'rgba(220,38,38,0.1)',
                        border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6,
                        fontSize: 11, color: RED, cursor: 'pointer', fontWeight: 700
                      }}
                    >
                      Remove & Upload Different PDF
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={30} color={AMBER} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Drag & Drop Job Description PDF here or click to browse
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      JD / Campus Drive PDF format · Max 8MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={jdFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleJdPDF(e.target.files[0]); }}
              />

              {/* Extracted Preview */}
              {jd && !jdPdfLoading && (
                <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 8, padding: '10px 12px', maxHeight: 130, overflowY: 'auto' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Extracted Job Description Preview
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {jd.slice(0, 360)}{jd.length > 360 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Paste Mode */
            <textarea
              value={jd}
              onChange={e => setJD(e.target.value)}
              rows={14}
              placeholder={`Paste the job description or campus drive spec here...\n\nInclude:\n• Required technical skills and frameworks\n• Key role responsibilities\n• Qualifications and minimum experience\n• Preferred bonus competencies`}
              style={{ ...TEXTAREA_STYLE, borderColor: 'rgba(217,119,6,0.2)' }}
            />
          )}

          {/* Quick-Load Sample Presets */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
              ⚡ Quick Test with Sample Campus JDs:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SAMPLE_JDS.map((sample) => (
                <button
                  key={sample.title}
                  onClick={() => loadSampleJD(sample)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(217,119,6,0.25)',
                    background: 'rgba(217,119,6,0.06)', color: AMBER, fontSize: 11,
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.06)'}
                >
                  {sample.title} ({sample.badge})
                </button>
              ))}
            </div>
          </div>
        </GlowCard>

      </div>

      {/* ── Run Analysis Button ── */}
      <button
        onClick={runAnalysis}
        disabled={!resume.trim() || !jd.trim() || analyzing || pdfLoading || jdPdfLoading}
        style={{
          width: '100%', padding: '16px',
          background: (!resume.trim() || !jd.trim()) ? 'var(--bg-card)' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          color: (!resume.trim() || !jd.trim()) ? 'var(--text-muted)' : '#ffffff',
          border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
          cursor: (!resume.trim() || !jd.trim()) ? 'not-allowed' : 'pointer',
          fontFamily: "'Sora',sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: (!resume.trim() || !jd.trim()) ? 'none' : '0 4px 24px rgba(79,70,229,0.35)',
          marginBottom: 28, transition: 'all 0.2s ease',
        }}
      >
        {analyzing ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Calculating ATS Compatibility Matrix...
          </>
        ) : (
          <>
            <Zap size={18} />
            Analyze ATS Compatibility & Generate Recommendations
          </>
        )}
      </button>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  RESULTS & DIRECT IMPLICATIONS WORKSPACE                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 1. Score Summary Banner Card */}
          <GlowCard accent={scoreColor} padding="28px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

              {/* Radial Dial with Loading Indicator */}
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: `conic-gradient(${scoreColor} ${result.score * 3.6}deg, var(--bg-card-high) 0)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 35px ${scoreColor}44`,
                  border: '2px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.5s ease'
                }}>
                  {isRecalculating ? (
                    <Loader2 size={32} color={scoreColor} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, fontFamily: "'Sora',sans-serif" }}>
                        {result.score}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 2 }}>/ 100</span>
                    </>
                  )}
                </div>
              </div>

              {/* Verdict, Score Evolution & Metrics */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>
                    {result.score >= 80 ? '🎯 Exceptional ATS Fit' : result.score >= 65 ? '⚡ Competitive Match' : result.score >= 50 ? '⚠️ Moderate Match — Needs Tailoring' : '🚨 High Rejection Risk'}
                  </span>
                  <span style={{
                    padding: '3px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900,
                    background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}44`
                  }}>
                    Grade: {result.grade}
                  </span>
                  <span style={{
                    padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: 'rgba(79,70,229,0.12)', color: CYAN, border: '1px solid rgba(79,70,229,0.3)'
                  }}>
                    Est. Pass Rate: ~{result.passProbability}%
                  </span>

                  {/* Score Delta Evolution Tracker */}
                  {initialScore !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 12px', background: result.score >= initialScore ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${result.score >= initialScore ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 20 }}>
                      <TrendingUp size={13} color={result.score >= initialScore ? GREEN : RED} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: result.score >= initialScore ? GREEN : RED }}>
                        Baseline: {initialScore} ➔ Current: {result.score} ({result.score >= initialScore ? `+${result.score - initialScore}` : result.score - initialScore} pts)
                        {lastScore !== null && lastScore !== result.score && (
                          <span style={{ marginLeft: 6, opacity: 0.85, fontWeight: 700 }}>
                            · Last: {result.score >= lastScore ? `+${result.score - lastScore}` : result.score - lastScore}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {result.score >= 80
                    ? 'Your resume closely mirrors the target job description. Both technical keywords, architecture concepts, and impact requirements align well with automated enterprise filters.'
                    : result.score >= 60
                    ? 'Good foundation, but several core keywords and technical phrases from the job description are missing. Click any "+ Apply" button below to imply suggestions directly into your resume!'
                    : 'Significant mismatch detected. Critical hard skills and terminology from the job description are absent. Click the ⚡ 1-Click suggestions below to immediately upgrade your score.'}
                </p>

                {/* Counter Badges */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(22,163,74,0.08)', padding: '4px 10px', borderRadius: 6 }}>
                    <CheckCircle size={14} /> {result.matchedSkillsList.length} skills matched
                  </span>
                  <span style={{ fontSize: 12, color: RED, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(220,38,38,0.08)', padding: '4px 10px', borderRadius: 6 }}>
                    <XCircle size={14} /> {result.missingSkillsList.length} critical skills missing
                  </span>
                  <span style={{ fontSize: 12, color: BLUE, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(37,99,235,0.08)', padding: '4px 10px', borderRadius: 6 }}>
                    <Award size={14} /> {result.matchedPhrases.length} phrases aligned
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-card-high)', padding: '4px 10px', borderRadius: 6 }}>
                    <FileText size={14} /> {result.wordCount} words
                  </span>
                </div>
              </div>

            </div>
          </GlowCard>

          {/* ── LIVE RESUME STUDIO & DIRECT IMPLICATIONS TOOLBAR ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 18px', flexWrap: 'wrap', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                ⚡ Direct Editor:
              </span>
              <button
                onClick={() => setShowLiveEditor(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: showLiveEditor ? CYAN : 'rgba(79,70,229,0.1)',
                  color: showLiveEditor ? '#ffffff' : CYAN,
                  border: `1px solid ${CYAN}44`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileEdit size={14} /> {showLiveEditor ? 'Hide Live Editor' : '✏️ Edit Resume Directly'}
              </button>
              <button
                onClick={() => reScoreNow()}
                disabled={isRecalculating}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: 'rgba(22,163,74,0.12)', color: GREEN,
                  border: `1px solid ${GREEN}44`, borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer'
                }}
              >
                {isRecalculating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                Recalculate Score
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* PDF Format Theme Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Format:</span>
                <select
                  value={selectedStyle}
                  onChange={e => setSelectedStyle(e.target.value)}
                  style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="classic">Classic Corporate (Navy)</option>
                  <option value="modern">Modern Tech (Indigo)</option>
                  <option value="minimal">Minimal Executive (Graphite)</option>
                </select>
              </div>

              {originalResume && originalResume !== resume && (
                <button
                  onClick={resetToOriginal}
                  title="Revert all applied suggestions and resume edits"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                    background: 'rgba(220,38,38,0.1)', color: RED,
                    border: `1px solid ${RED}33`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={13} /> Revert
                </button>
              )}

              <button
                onClick={downloadUpdatedPDF}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: 'rgba(37,99,235,0.12)', color: BLUE,
                  border: `1px solid ${BLUE}44`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Download size={14} /> Download Formatted PDF
              </button>
            </div>
          </div>

          {/* ── EXPANDABLE IN-PLACE LIVE RESUME EDITOR ── */}
          {showLiveEditor && (
            <GlowCard
              title="✏️ In-Place Live Resume Editor"
              subtitle="All suggestions applied below are inserted directly into this text. Click 'Save & Recalculate' to update your ATS score."
              accent={CYAN}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={resume}
                  onChange={e => setResume(e.target.value)}
                  rows={14}
                  style={TEXTAREA_STYLE}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {resume.split(/\s+/).filter(Boolean).length} words · Direct in-browser editing
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => reScoreNow()}
                      disabled={isRecalculating}
                      style={{
                        padding: '8px 18px', background: CYAN, color: '#ffffff',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 2px 10px rgba(79,70,229,0.3)'
                      }}
                    >
                      {isRecalculating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                      Save & Recalculate Score
                    </button>
                  </div>
                </div>
              </div>
            </GlowCard>
          )}

          {/* 2. Interactive Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6, overflowX: 'auto' }}>
            {[
              { id: 'overview',    label: '📊 Score Breakdown', count: null },
              { id: 'keywords',    label: '🎯 Keyword & Skill Diagnostics', count: result.missingSkillsList.length },
              { id: 'suggestions', label: '💡 Actionable Improvisations & X-Y-Z Rewrites', count: (result.suggestions.critical.length + result.suggestions.recommended.length) },
              { id: 'audit',       label: '📋 ATS Format & Section Audit', count: null },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, fontFamily: "'Sora',sans-serif",
                    background: active ? CYAN : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s ease', flexShrink: 0
                  }}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(220,38,38,0.15)',
                      color: active ? '#ffffff' : RED
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: OVERVIEW & BREAKDOWN ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

              {/* Score Component Bars */}
              <GlowCard title="Score Allocation Matrix" subtitle="Detailed breakdown of all 6 weighted ATS algorithm components" accent={VIOLET}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {result.breakdown.map(({ label, detail, score, max, color, pct }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{detail}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color }}>{score} / {max} pts</span>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 7, background: 'var(--bg-card-high)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(score / max) * 100}%`,
                          height: '100%',
                          background: color,
                          borderRadius: 4,
                          boxShadow: `0 0 10px ${color}66`,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 8, padding: '12px 14px', background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total Evaluated Score</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{result.score} / 100</span>
                  </div>
                </div>
              </GlowCard>

              {/* Resume Vital Diagnostics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Length & Density */}
                <GlowCard title="Word Count & Document Density" accent={CYAN}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>{result.wordCount}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>Words</span>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: result.wordCount >= 380 && result.wordCount <= 750 ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
                      color: result.wordCount >= 380 && result.wordCount <= 750 ? GREEN : AMBER
                    }}>
                      {result.wordCount >= 380 && result.wordCount <= 750 ? '✅ Ideal 1-Page Density' : result.wordCount < 380 ? '⚠️ Sparse Word Count' : '⚠️ Potential Multi-Page Length'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Industry standard for campus placements and junior tech roles is 400 to 700 words. This provides enough technical density for ATS keyword matching without triggering formatting truncation.
                  </p>
                </GlowCard>

                {/* Seniority Alignment */}
                <GlowCard title="Seniority Fit & Level Matching" accent={AMBER}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Target size={20} color={AMBER} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Detected Target Level: <span style={{ color: AMBER }}>{result.detectedJdLevel}</span>
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {result.detectedJdLevel === 'JUNIOR'
                      ? 'The role is geared toward freshers/entry-level engineers. Focus your resume heavily on projects, core CS fundamentals (DSA/OS/DBMS), and modern frameworks.'
                      : result.detectedJdLevel === 'MID'
                      ? 'The role expects independent project ownership. Emphasize production deployments, CI/CD, and system architecture in your work experience.'
                      : 'Ensure your stated years of experience and project scope reflect the expectations of this job tier.'}
                  </p>
                </GlowCard>

              </div>

            </div>
          )}

          {/* ── TAB 2: KEYWORD & SKILL DIAGNOSTICS (WITH 1-CLICK APPLY) ── */}
          {activeTab === 'keywords' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Action Bar: 1-Click Apply All & Copy Bank */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Missing Skills Action Center
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                    Click <strong>"+ Add"</strong> on any individual skill or click <strong>"Apply All"</strong> to automatically insert missing skills into your resume and recalibrate your score!
                  </p>
                </div>
                {result.missingSkillsList.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={applyAllMissingSkills}
                      style={{
                        padding: '8px 16px', background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.35)',
                        borderRadius: 8, color: GREEN, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={14} /> + Apply All Missing Skills ({result.missingSkillsList.length})
                    </button>
                    <button
                      onClick={() => copyText(result.missingSkillsList.join(', '), 'all missing skills')}
                      style={{
                        padding: '8px 14px', background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.3)',
                        borderRadius: 8, color: CYAN, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      {copiedSkill === 'all missing skills' ? <Check size={14} /> : <Copy size={14} />}
                      Copy All
                    </button>
                  </div>
                )}
              </div>

              {/* Categorized Skills Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {Object.entries(result.categoryResults).map(([catKey, data]) => (
                  <GlowCard key={catKey} title={data.label} accent={data.pct >= 70 ? GREEN : data.pct >= 40 ? AMBER : RED}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{data.matched.length} of {data.jdSkills.length} matched</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: data.pct >= 70 ? GREEN : data.pct >= 40 ? AMBER : RED }}>{data.pct}% match</span>
                    </div>

                    {/* Matched */}
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ✅ Matched
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {data.matched.length > 0 ? (
                        data.matched.map(s => (
                          <span key={s} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(22,163,74,0.1)', color: GREEN, border: '1px solid rgba(22,163,74,0.25)' }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748b' }}>None matched</span>
                      )}
                    </div>

                    {/* Missing with 1-Click Apply */}
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ❌ Missing from Resume (Click to Apply)
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.missing.length > 0 ? (
                        data.missing.map(s => {
                          const isApplied = appliedItems.has(`skill_${s}`);
                          return (
                            <div
                              key={s}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: isApplied ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.08)',
                                border: `1px solid ${isApplied ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.25)'}`,
                                borderRadius: 6, padding: '3px 6px'
                              }}
                            >
                              <span style={{ fontSize: 11, fontWeight: 700, color: isApplied ? GREEN : RED }}>
                                {s}
                              </span>
                              <button
                                onClick={() => applySkill(s)}
                                title={isApplied ? 'Skill already added to resume' : 'Insert skill directly into resume'}
                                style={{
                                  padding: '2px 5px', borderRadius: 4, border: 'none',
                                  background: isApplied ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)',
                                  color: isApplied ? GREEN : RED, fontSize: 10, fontWeight: 800,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                }}
                              >
                                {isApplied ? <Check size={10} /> : <Plus size={10} />}
                                {isApplied ? 'Added' : 'Add'}
                              </button>
                              <button
                                onClick={() => copyText(s, s)}
                                title="Copy to clipboard"
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>All detected skills matched!</span>
                      )}
                    </div>
                  </GlowCard>
                ))}
              </div>

              {/* General Keywords */}
              <GlowCard title="General Vocabulary & Job Terminology" accent={BLUE}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: GREEN }}>
                      ✅ Matched Words ({result.matchedKeywords.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                      {result.matchedKeywords.slice(0, 30).map(w => (
                        <span key={w} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(22,163,74,0.08)', color: GREEN, border: '1px solid rgba(22,163,74,0.2)' }}>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: RED }}>
                      ❌ Top Missing General Keywords ({result.missingKeywords.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                      {result.missingKeywords.slice(0, 30).map(w => (
                        <span
                          key={w}
                          onClick={() => { applySkill(w); }}
                          title="Click to insert into resume"
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,0.08)', color: RED, border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}
                        >
                          + {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>

            </div>
          )}

          {/* ── TAB 3: ACTIONABLE IMPROVISATIONS & X-Y-Z REWRITES (WITH 1-CLICK INSERT) ── */}
          {activeTab === 'suggestions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Google X-Y-Z Formula Spotlight Card */}
              <GlowCard title="⚡ The Google X-Y-Z Bullet Point Formula" accent={GREEN}>
                <div style={{ padding: '12px 14px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, marginBottom: 14 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: GREEN }}>
                    "Accomplished [X], as measured by [Y], by doing [Z]"
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Enterprise ATS systems score resumes higher when bullet points combine quantifiable results (percentages, throughput, user metrics) with target technologies.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: RED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>❌ Weak Bullet (Passive, No Numbers)</span>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      "Responsible for working on backend REST APIs and database queries in Node.js."
                    </p>
                  </div>
                  <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ ATS-Optimized (Google X-Y-Z)</span>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      "Engineered scalable RESTful API endpoints in Node.js, reducing query response times by 35% across 20,000+ daily active users."
                    </p>
                  </div>
                </div>
              </GlowCard>

              {/* Dynamic Tailored Bullet Point Generator (WITH 1-CLICK INSERT) */}
              <GlowCard title="✨ Tailored Bullet Points Ready for Your Resume" subtitle="Click '+ Apply to Resume' to instantly insert any bullet point into your projects section!" accent={CYAN}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.tailoredRewrites.map((item, idx) => {
                    const isApplied = appliedItems.has(`bullet_${item.skill}`);
                    const isCopied = copiedSkill === item.template;
                    return (
                      <div key={idx} style={{ padding: '14px 16px', background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            🎯 Target Skill: {item.skill}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => applyBulletRewrite(item.template, item.skill)}
                              style={{
                                padding: '4px 12px',
                                background: isApplied ? 'rgba(22,163,74,0.15)' : 'rgba(79,70,229,0.15)',
                                border: `1px solid ${isApplied ? 'rgba(22,163,74,0.35)' : 'rgba(79,70,229,0.35)'}`,
                                borderRadius: 6, color: isApplied ? GREEN : CYAN, fontSize: 11,
                                fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isApplied ? <Check size={12} /> : <Plus size={12} />}
                              {isApplied ? '✓ Added to Resume' : '⚡ + Apply to Resume'}
                            </button>
                            <button
                              onClick={() => copyText(item.template, item.template)}
                              style={{
                                padding: '4px 10px', background: 'var(--bg-input)',
                                border: '1px solid var(--border)', borderRadius: 6,
                                color: '#64748b', fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                          "{item.template}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </GlowCard>

              {/* Prioritized Actionable Recommendations */}
              <GlowCard title="Prioritized Improvement Roadmap" accent={AMBER}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Critical */}
                  {result.suggestions.critical.map((s, i) => (
                    <div key={`crit-${i}`} style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <AlertTriangle size={18} color={RED} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: RED }}>{s.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,0.15)', color: RED }}>CRITICAL FIX</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}

                  {/* Recommended */}
                  {result.suggestions.recommended.map((s, i) => (
                    <div key={`rec-${i}`} style={{ padding: '12px 16px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Lightbulb size={18} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: AMBER }}>{s.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(217,119,6,0.15)', color: AMBER }}>HIGH IMPACT</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}

                  {/* Polishing */}
                  {result.suggestions.polishing.map((s, i) => (
                    <div key={`pol-${i}`} style={{ padding: '12px 16px', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Sparkles size={18} color={CYAN} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: CYAN }}>{s.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(79,70,229,0.15)', color: CYAN }}>POLISH</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}

                </div>
              </GlowCard>

              {/* Action Verbs vs Passive Verbs (WITH AUTO-REPLACE) */}
              <GlowCard title="Power Verbs vs Passive Expressions" subtitle="Replace weak expressions directly in your resume with active ownership verbs" accent={GREEN}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: GREEN }}>
                      ✅ Power Verbs Detected in Your Resume ({result.usedVerbs.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {result.usedVerbs.length > 0 ? (
                        result.usedVerbs.map(v => (
                          <span key={v} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(22,163,74,0.1)', color: GREEN, border: '1px solid rgba(22,163,74,0.2)' }}>
                            {v}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: '#64748b' }}>No strong power verbs detected. Add words like: engineered, built, deployed.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: RED }}>
                      ⚠️ Passive Phrases Detected ({result.detectedWeakPhrases.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.detectedWeakPhrases.length > 0 ? (
                        result.detectedWeakPhrases.map(w => {
                          const isApplied = appliedItems.has(`weak_${w.phrase}`);
                          return (
                            <div key={w.phrase} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: 'rgba(220,38,38,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div>
                                Replace "<strong style={{ color: RED }}>{w.phrase}</strong>" with <strong style={{ color: GREEN }}>{w.suggestion}</strong>
                              </div>
                              <button
                                onClick={() => applyWeakPhraseFix(w.phrase, w.suggestion)}
                                style={{
                                  padding: '3px 8px', borderRadius: 4,
                                  background: isApplied ? 'rgba(22,163,74,0.2)' : 'rgba(79,70,229,0.15)',
                                  border: `1px solid ${isApplied ? 'rgba(22,163,74,0.35)' : 'rgba(79,70,229,0.35)'}`,
                                  color: isApplied ? GREEN : CYAN, fontSize: 10, fontWeight: 800, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0
                                }}
                              >
                                {isApplied ? <Check size={10} /> : <Zap size={10} />}
                                {isApplied ? 'Replaced' : '⚡ Auto-Replace'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>No weak/passive phrases found!</span>
                      )}
                    </div>
                  </div>
                </div>
              </GlowCard>

            </div>
          )}

          {/* ── TAB 4: ATS FORMAT & SECTION AUDIT (WITH 1-CLICK SECTION TEMPLATES) ── */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Section Health Checklist */}
              <GlowCard title="Standard Resume Section Completeness" subtitle="Enterprise ATS systems rely on predictable section headings to parse career history" accent={CYAN}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {[
                    { key: 'hasContact',        label: 'Contact Info & Links', hint: 'Email, Phone, LinkedIn, GitHub' },
                    { key: 'hasSummary',        label: 'Summary / Profile',    hint: '2-3 line role alignment' },
                    { key: 'hasEducation',      label: 'Education Section',    hint: 'Degree, University, GPA' },
                    { key: 'hasExperience',     label: 'Work Experience',      hint: 'Internships / Full-time' },
                    { key: 'hasSkills',         label: 'Technical Skills',     hint: 'Languages, Frameworks, Tools' },
                    { key: 'hasProjects',       label: 'Featured Projects',    hint: 'Tech stack + GitHub links' },
                    { key: 'hasCertifications', label: 'Certifications',       hint: 'Cloud or industry certs' },
                  ].map(({ key, label, hint }) => {
                    const found = result.sections[key];
                    const isApplied = appliedItems.has(`section_${key}`);
                    return (
                      <div
                        key={key}
                        style={{
                          padding: '12px 14px', borderRadius: 10,
                          background: found ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                          border: `1px solid ${found ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {found ? <CheckCircle size={18} color={GREEN} /> : <XCircle size={18} color={RED} />}
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: found ? 'var(--text-primary)' : RED, display: 'block' }}>
                              {label}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{hint}</span>
                          </div>
                        </div>

                        {!found && ['hasSummary', 'hasProjects', 'hasSkills', 'hasCertifications', 'hasContact'].includes(key) && (
                          <button
                            onClick={() => applyMissingSection(key)}
                            style={{
                              padding: '3px 8px', borderRadius: 6,
                              background: isApplied ? 'rgba(22,163,74,0.15)' : 'rgba(79,70,229,0.12)',
                              border: `1px solid ${isApplied ? 'rgba(22,163,74,0.3)' : 'rgba(79,70,229,0.3)'}`,
                              color: isApplied ? GREEN : CYAN, fontSize: 10,
                              fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                            }}
                          >
                            {isApplied ? <Check size={10} /> : <Plus size={10} />}
                            {isApplied ? 'Added' : 'Insert'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlowCard>

              {/* Universal ATS Rules Safeguard */}
              <GlowCard title="Universal ATS Formatting Compliance Guidelines" accent={VIOLET}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {[
                    { title: 'Single-Column Layout Only', desc: 'Never use 2-column templates or sidebar tables. Automated ATS parsers read left-to-right and scramble multi-column text.' },
                    { title: 'Avoid Text Boxes & Tables', desc: 'Do not put contact details or skills inside Word text boxes or complex nested tables. Parsers frequently drop text box contents completely.' },
                    { title: 'Standard Standard Headings', desc: 'Use canonical titles: "Work Experience", "Education", "Projects", "Skills". Avoid creative titles like "Where I have Been".' },
                    { title: 'Clean PDF or DOCX Export', desc: 'Always export directly from Word, Google Docs, or LaTeX. Never submit an image scan (JPEG/PNG) masquerading as a PDF.' }
                  ].map((rule, idx) => (
                    <div key={idx} style={{ padding: '12px 14px', background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: CYAN, display: 'block', marginBottom: 4 }}>
                        ✓ {rule.title}
                      </span>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                        {rule.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </GlowCard>

              {/* What To Do Next Roadmap */}
              <GlowCard title="🚀 Action Plan Before Submitting" accent={GREEN}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {[
                    { step: '1', title: 'Inject Missing Hard Skills', desc: 'Click "+ Apply" on missing skills in Tab 2 to add them directly into your resume.', color: RED },
                    { step: '2', title: 'Adopt Google X-Y-Z Bullets', desc: 'Click "⚡ + Apply to Resume" on tailored bullet points from Tab 3 to insert quantified achievements.', color: AMBER },
                    { step: '3', title: 'Re-Analyze to Verify 80+', desc: 'Watch your score climb above 80+. Download your updated PDF or export to Resume Builder!', color: GREEN },
                  ].map(({ step, title, desc, color }) => (
                    <div key={step} style={{ padding: '14px 16px', background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}20`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color, marginBottom: 8 }}>
                        {step}
                      </div>
                      <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    onClick={downloadUpdatedPDF}
                    style={{
                      padding: '10px 18px', background: 'rgba(37,99,235,0.12)', color: BLUE,
                      border: `1px solid ${BLUE}44`, borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: "'Sora',sans-serif"
                    }}
                  >
                    <Download size={15} /> Download Formatted ATS Resume PDF
                  </button>

                  <button
                    onClick={() => navigate('/student/resume')}
                    style={{
                      padding: '12px 20px', background: CYAN, color: '#ffffff',
                      border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: "'Sora',sans-serif", boxShadow: '0 4px 16px rgba(79,70,229,0.3)'
                    }}
                  >
                    <FileEdit size={16} /> Open SmartHire Resume Builder to Format & Save
                  </button>
                </div>
              </GlowCard>

            </div>
          )}

        </div>
      )}

    </div>
  );
}

// ── Shared Textarea Style ───────────────────────────────────────────────────
const TEXTAREA_STYLE = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: "'Sora',sans-serif",
  boxSizing: 'border-box',
  resize: 'vertical',
  lineHeight: 1.7,
};
