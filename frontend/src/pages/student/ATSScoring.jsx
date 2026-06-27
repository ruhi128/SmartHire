// src/pages/student/ATSScoring.jsx
import { useState, useRef, useCallback } from 'react';
import GlowCard from '../../components/GlowCard';
import {
  Search, CheckCircle, XCircle, Zap, FileText,
  Briefcase, Upload, X, AlertCircle, Loader2,
  TrendingUp, Target, Award
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

// ✅ Set PDF.js worker

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const CYAN = '#00c8f0', GREEN = '#10c98a', AMBER = '#f5a623',
      RED  = '#f04b4b', VIOLET = '#7c5cfc';

// ── Stop words ──────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','in','on','at','for','with','and','or','to','of',
  'is','are','was','were','be','been','have','has','will','would',
  'should','can','this','that','they','you','we','it','as','by',
  'from','but','not','our','your','their','its','also','more',
  'than','about','into','through','during','before','after','above',
  'below','between','each','such','when','while','although','however',
]);

// ── Tech phrases to detect ───────────────────────────────────────────────────
const TECH_PHRASES = [
  'machine learning','data structures','system design','rest api',
  'node.js','react.js','spring boot','deep learning','natural language',
  'version control','agile methodology','ci/cd','microservices',
  'cloud computing','object oriented','artificial intelligence',
  'data analysis','full stack','front end','back end','devops',
  'unit testing','test driven','continuous integration',
  'continuous deployment','software development','web development',
  'mobile development','database management','api integration',
  'docker','kubernetes','machine learning','neural network',
];

// ── Action verbs (good to have) ──────────────────────────────────────────────
const ACTION_VERBS = [
  'developed','built','designed','implemented','created','managed',
  'led','improved','optimized','reduced','increased','deployed',
  'architected','collaborated','delivered','achieved','automated',
  'integrated','migrated','maintained',
];

// ═══════════════════════════════════════════════════════════════════════════
//  ATS ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  ATS ANALYSIS ENGINE — Pure JD-Resume matching
// ═══════════════════════════════════════════════════════════════════════════
function analyzeATS(resumeText, jd) {

  // ── Clean and tokenize ──────────────────────────────────────────────────
  const tokenize = (text) =>
    text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const resumeTokens = tokenize(resumeText);
  const jdTokens     = [...new Set(tokenize(jd))]; // unique JD words

  const resumeLow = resumeText.toLowerCase();
  const jdLow     = jd.toLowerCase();

  // ── 1. Keyword Match (40 pts) ───────────────────────────────────────────
  // Every unique JD keyword checked against resume
  const matchedKeywords = jdTokens.filter(w => resumeTokens.includes(w));
  const missingKeywords = jdTokens.filter(w => !resumeTokens.includes(w));

  const keywordScore = jdTokens.length > 0
    ? (matchedKeywords.length / jdTokens.length) * 40
    : 0;

  // ── 2. Tech Phrase Match (25 pts) ───────────────────────────────────────
  // Only phrases that BOTH appear in JD and resume count
  const TECH_PHRASES = [
    'machine learning','data structures','system design','rest api',
    'node js','react js','spring boot','deep learning','natural language',
    'version control','agile methodology','ci cd','microservices',
    'cloud computing','object oriented','artificial intelligence',
    'data analysis','full stack','front end','back end','devops',
    'unit testing','test driven','continuous integration',
    'continuous deployment','software development','web development',
    'mobile development','database management','api integration',
    'problem solving','team player','communication skills',
    'project management','software engineering','computer science',
  ];

  const jdPhrases      = TECH_PHRASES.filter(p => jdLow.includes(p));
  const matchedPhrases = jdPhrases.filter(p => resumeLow.includes(p));
  const missingPhrases = jdPhrases.filter(p => !resumeLow.includes(p));

  const phraseScore = jdPhrases.length > 0
    ? (matchedPhrases.length / jdPhrases.length) * 25
    : 15; // neutral if JD has no detectable phrases

  // ── 3. Skills Section Match (20 pts) ────────────────────────────────────
  // Extract specific tech skills from JD and check in resume
  const SKILL_PATTERNS = [
    'python','java','javascript','typescript','c\\+\\+','c#','golang',
    'ruby','php','swift','kotlin','rust','scala','r\\b',
    'react','angular','vue','nextjs','nodejs','express','django',
    'flask','spring','laravel','rails',
    'mysql','postgresql','mongodb','redis','sqlite','oracle','firebase',
    'aws','azure','gcp','docker','kubernetes','jenkins','git','linux',
    'tensorflow','pytorch','pandas','numpy','scikit','hadoop','spark',
    'html','css','sass','tailwind','bootstrap','graphql','sql',
    'figma','photoshop','tableau','powerbi','excel','matlab',
  ];

  const jdSkills      = SKILL_PATTERNS.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(jd));
  const matchedSkills = jdSkills.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(resumeText));
  const missingSkills = jdSkills.filter(s => !new RegExp(`\\b${s}\\b`, 'i').test(resumeText));

  const skillScore = jdSkills.length > 0
    ? (matchedSkills.length / jdSkills.length) * 20
    : 10; // neutral if JD has no detectable skills

  // ── 4. Experience / Seniority Match (10 pts) ────────────────────────────
  // Check if experience level mentioned in JD matches resume
  const seniorityTerms = {
    junior:  ['junior','entry level','entry-level','fresher','graduate','0-1','0-2','1 year'],
    mid:     ['mid level','mid-level','2-3','2-4','3 years','3-5','intermediate'],
    senior:  ['senior','lead','principal','5+','5 years','7 years','expert','architect'],
  };

  let experienceScore = 5; // default neutral
  const jdSeniority = Object.entries(seniorityTerms).find(([, terms]) =>
    terms.some(t => jdLow.includes(t))
  );
  if (jdSeniority) {
    const resumeHasSeniority = seniorityTerms[jdSeniority[0]].some(t =>
      resumeLow.includes(t)
    );
    experienceScore = resumeHasSeniority ? 10 : 2;
  }

  // ── 5. Responsibility Match (5 pts) ─────────────────────────────────────
  // Extract key responsibility words from JD and check resume
  const jdResponsibilities = jdTokens.filter(w =>
    w.length > 5 &&
    !['experience','required','preferred','skills','knowledge','ability',
      'strong','working','including','position','company','team','work',
      'years','least','minimum','equivalent'].includes(w)
  );

  const topResponsibilities = jdResponsibilities.slice(0, 30);
  const matchedResponsibilities = topResponsibilities.filter(w =>
    resumeTokens.includes(w)
  );

  const responsibilityScore = topResponsibilities.length > 0
    ? (matchedResponsibilities.length / topResponsibilities.length) * 5
    : 2.5;

  // ── Total Score ──────────────────────────────────────────────────────────
  const rawScore = keywordScore + phraseScore + skillScore + experienceScore + responsibilityScore;
  const score    = Math.min(100, Math.max(0, Math.round(rawScore)));
  const grade    = score >= 85 ? 'A+' : score >= 75 ? 'A'  : score >= 65 ? 'B+'
                 : score >= 55 ? 'B'  : score >= 45 ? 'C'  : score >= 35 ? 'D' : 'F';

  // ── Section Detection (for suggestions only, NOT scoring) ───────────────
  const sections = {
    hasContact:        /email|phone|linkedin|github|@/i.test(resumeText),
    hasSummary:        /summary|objective|about|profile/i.test(resumeText),
    hasEducation:      /education|degree|university|college|bachelor|master|b\.tech|m\.tech/i.test(resumeText),
    hasExperience:     /experience|internship|employment|work history/i.test(resumeText),
    hasSkills:         /skills|technologies|tools|languages|frameworks/i.test(resumeText),
    hasProjects:       /project|github|portfolio/i.test(resumeText),
    hasCertifications: /certification|certificate|certified|coursera|udemy|aws|google/i.test(resumeText),
  };

  const hasQuantified = /\d+%|\d+x|\d+\s*(users|clients|projects|members|million|thousand)/i.test(resumeText);

  const ACTION_VERBS = [
    'developed','built','designed','implemented','created','managed',
    'led','improved','optimized','reduced','increased','deployed',
    'architected','collaborated','delivered','automated','integrated',
  ];
  const usedVerbs = ACTION_VERBS.filter(v => resumeLow.includes(v));

  // ── Suggestions based on actual gaps ────────────────────────────────────
  const suggestions = [];

  // Critical keyword gap
  const criticalMissing = missingKeywords.filter(w => w.length > 4).slice(0, 8);
  if (criticalMissing.length > 0)
    suggestions.push({
      type: 'error',
      text: `Add these keywords from the JD: ${criticalMissing.join(', ')}.`,
    });

  // Missing skills
  if (missingSkills.length > 0)
    suggestions.push({
      type: 'error',
      text: `Add these technical skills mentioned in JD: ${missingSkills.slice(0, 6).join(', ')}.`,
    });

  // Missing phrases
  if (missingPhrases.length > 0)
    suggestions.push({
      type: 'warning',
      text: `Include these tech phrases from the JD: ${missingPhrases.slice(0, 4).join(', ')}.`,
    });

  // Section gaps
  if (!sections.hasSummary)
    suggestions.push({ type: 'error', text: 'Add a Professional Summary tailored to this specific job role.' });
  if (!sections.hasSkills)
    suggestions.push({ type: 'error', text: 'Add a dedicated Skills section listing your technical skills.' });
  if (!sections.hasProjects)
    suggestions.push({ type: 'warning', text: 'Add a Projects section with GitHub links.' });
  if (!sections.hasExperience)
    suggestions.push({ type: 'warning', text: 'Add an Experience or Internships section.' });
  if (!hasQuantified)
    suggestions.push({ type: 'warning', text: 'Quantify achievements — e.g. "improved performance by 40%" or "served 10,000+ users".' });
  if (usedVerbs.length < 4)
    suggestions.push({ type: 'warning', text: 'Use more action verbs: developed, built, optimized, deployed, led, improved...' });
  if (resumeText.split(/\s+/).filter(Boolean).length < 200)
    suggestions.push({ type: 'warning', text: 'Resume is too short — add more detail (aim for 400–600 words).' });
  if (score >= 70)
    suggestions.push({ type: 'info', text: 'Good match! Make sure your resume is ATS-formatted (no tables, no images, simple fonts).' });

  // ── Score breakdown for display ──────────────────────────────────────────
  const breakdown = [
    {
      label: `Keyword Match (${matchedKeywords.length}/${jdTokens.length} JD keywords)`,
      score: Math.round(keywordScore),
      max: 40,
      color: VIOLET,
      pct: jdTokens.length > 0 ? Math.round((matchedKeywords.length / jdTokens.length) * 100) : 0,
    },
    {
      label: `Tech Phrases (${matchedPhrases.length}/${jdPhrases.length} detected in JD)`,
      score: Math.round(phraseScore),
      max: 25,
      color: CYAN,
      pct: jdPhrases.length > 0 ? Math.round((matchedPhrases.length / jdPhrases.length) * 100) : 100,
    },
    {
      label: `Skills Match (${matchedSkills.length}/${jdSkills.length} skills in JD)`,
      score: Math.round(skillScore),
      max: 20,
      color: GREEN,
      pct: jdSkills.length > 0 ? Math.round((matchedSkills.length / jdSkills.length) * 100) : 50,
    },
    {
      label: 'Experience Level Alignment',
      score: experienceScore,
      max: 10,
      color: AMBER,
      pct: Math.round((experienceScore / 10) * 100),
    },
    {
      label: 'Responsibility Keywords',
      score: Math.round(responsibilityScore),
      max: 5,
      color: RED,
      pct: Math.round((responsibilityScore / 5) * 100),
    },
  ];

  return {
    score, grade,
    matched: matchedKeywords,
    missing: missingKeywords.filter(w => w.length > 3).slice(0, 20),
    matchedPhrases, missingPhrases,
    matchedSkills, missingSkills,
    usedVerbs, hasQuantified, sections,
    suggestions, breakdown,
    wordCount: resumeText.split(/\s+/).filter(Boolean).length,
    stats: {
      keywordMatchPct: jdTokens.length > 0
        ? Math.round((matchedKeywords.length / jdTokens.length) * 100) : 0,
      phraseMatchPct: jdPhrases.length > 0
        ? Math.round((matchedPhrases.length / jdPhrases.length) * 100) : 0,
      skillMatchPct: jdSkills.length > 0
        ? Math.round((matchedSkills.length / jdSkills.length) * 100) : 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  PDF TEXT EXTRACTOR
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
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ATSScoring() {
  const [resume,       setResume]       = useState('');
  const [jd,           setJD]           = useState('');
  const [result,       setResult]       = useState(null);
  const [inputMode,    setInputMode]    = useState('paste'); // 'paste' | 'pdf'
  const [pdfFile,      setPdfFile]      = useState(null);
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [dragging,     setDragging]     = useState(false);
  const [analyzing,    setAnalyzing]    = useState(false);
  const fileInputRef   = useRef(null);

  // ── PDF Upload Handler ───────────────────────────────────────────────────
  const handlePDF = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('PDF must be under 5MB');
      return;
    }

    setPdfFile(file);
    setPdfLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 50) {
        toast.error('Could not extract text from PDF. Try pasting manually.');
        setPdfFile(null);
        return;
      }
      setResume(text);
      toast.success(`✅ Extracted ${text.split(/\s+/).filter(Boolean).length} words from PDF`);
    } catch (err) {
      console.error('PDF extract error:', err);
      toast.error('Failed to read PDF. Please paste your resume text instead.');
      setPdfFile(null);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // ── Drag and drop ────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePDF(file);
  }, [handlePDF]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave= () => setDragging(false);

  // ── Analyze ──────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) {
      toast.error('Please provide both resume and job description');
      return;
    }
    setAnalyzing(true);
    // Small delay so UI updates
    await new Promise(r => setTimeout(r, 300));
    setResult(analyzeATS(resume, jd));
    setAnalyzing(false);
  };

  const clearResume = () => {
    setResume('');
    setPdfFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scoreColor = !result ? CYAN
    : result.score >= 70 ? GREEN
    : result.score >= 45 ? AMBER
    : RED;

  const suggestionColors = {
    error:   { bg: 'rgba(240,75,75,0.08)',   border: 'rgba(240,75,75,0.2)',   color: RED,   icon: '🔴' },
    warning: { bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.2)',  color: AMBER, icon: '🟡' },
    info:    { bg: 'rgba(0,200,240,0.08)',   border: 'rgba(0,200,240,0.2)',   color: CYAN,  icon: '🔵' },
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" }}>
          ATS Score Checker
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569' }}>
          Upload your resume PDF or paste text — get an instant ATS compatibility score with detailed feedback
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '10px 16px', marginBottom: 20, background: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={15} color={VIOLET} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
          <strong style={{ color: VIOLET }}>How scoring works:</strong> Keywords (50pts) + Tech phrases (20pts) + Action verbs (10pts) + Quantified impact (8pts) + Resume sections (21pts) = 100 points total.
          Scores above 70 indicate a strong match.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Resume Input */}
        <GlowCard
          title="Your Resume"
          accent={CYAN}
          headerRight={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {resume && <span style={{ fontSize: 11, color: '#475569' }}>{resume.split(/\s+/).filter(Boolean).length} words</span>}
              {resume && (
                <button onClick={clearResume} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          }
        >
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
            {[['paste', '✏️ Paste Text'], ['pdf', '📄 Upload PDF']].map(([mode, label]) => (
              <button key={mode} onClick={() => setInputMode(mode)} style={{
                flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif",
                background: inputMode === mode ? CYAN : 'transparent',
                color: inputMode === mode ? '#040c18' : '#64748b',
              }}>{label}</button>
            ))}
          </div>

          {/* PDF Upload mode */}
          {inputMode === 'pdf' && (
            <>
              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? CYAN : 'rgba(0,200,240,0.25)'}`,
                  borderRadius: 10,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: pdfFile ? 'default' : 'pointer',
                  background: dragging ? 'rgba(0,200,240,0.08)' : 'rgba(0,200,240,0.03)',
                  transition: 'all 0.2s',
                  marginBottom: 10,
                }}
              >
                {pdfLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={28} color={CYAN} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ margin: 0, fontSize: 13, color: CYAN }}>Extracting text from PDF...</p>
                  </div>
                ) : pdfFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={28} color={GREEN} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: GREEN }}>{pdfFile.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      {(pdfFile.size / 1024).toFixed(1)} KB · {resume.split(/\s+/).filter(Boolean).length} words extracted
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearResume(); setInputMode('pdf'); }}
                      style={{ marginTop: 4, padding: '4px 12px', background: 'rgba(240,75,75,0.1)', border: '1px solid rgba(240,75,75,0.3)', borderRadius: 6, fontSize: 11, color: RED, cursor: 'pointer', fontWeight: 700 }}
                    >
                      Remove & Upload Again
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={28} color={CYAN} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                      Drop your PDF here or click to browse
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
                      PDF format only · Max 5MB
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

              {/* Show extracted text preview */}
              {resume && !pdfLoading && (
                <div style={{ background: '#071525', border: '1px solid rgba(0,200,240,0.1)', borderRadius: 8, padding: '10px 12px', maxHeight: 140, overflowY: 'auto' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Extracted Text Preview
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {resume.slice(0, 400)}{resume.length > 400 ? '...' : ''}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Paste mode */}
          {inputMode === 'paste' && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <FileText size={13} color={CYAN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Paste your complete resume text below</p>
              </div>
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                rows={13}
                placeholder={`Paste your resume content here...\n\nInclude:\n• Personal info & contact\n• Education details\n• Technical skills\n• Work experience / internships\n• Projects with tech stack\n• Certifications`}
                style={TA}
              />
            </>
          )}
        </GlowCard>

        {/* Job Description */}
        <GlowCard
          title="Job Description"
          accent={AMBER}
          headerRight={<span style={{ fontSize: 11, color: '#475569' }}>{jd.split(/\s+/).filter(Boolean).length} words</span>}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <Briefcase size={13} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Paste the target job description</p>
          </div>
          <textarea
            value={jd}
            onChange={e => setJD(e.target.value)}
            rows={inputMode === 'pdf' ? 16 : 13}
            placeholder={`Paste the job description here...\n\nInclude:\n• Required skills & technologies\n• Responsibilities\n• Qualifications\n• Nice-to-have skills\n• Company description`}
            style={{ ...TA, borderColor: 'rgba(245,166,35,0.2)' }}
          />

          {/* Quick tips */}
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.12)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
              💡 <strong style={{ color: AMBER }}>Tip:</strong> Include the full JD — required skills, responsibilities, and qualifications. The more complete, the more accurate your score.
            </p>
          </div>
        </GlowCard>
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyze}
        disabled={!resume.trim() || !jd.trim() || analyzing || pdfLoading}
        style={{
          width: '100%', padding: '14px',
          background: (!resume.trim() || !jd.trim()) ? '#0b1a2e' : CYAN,
          color: (!resume.trim() || !jd.trim()) ? '#334155' : '#040c18',
          border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: (!resume.trim() || !jd.trim()) ? 'not-allowed' : 'pointer',
          fontFamily: "'Sora',sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: (!resume.trim() || !jd.trim()) ? 'none' : '0 4px 20px rgba(0,200,240,0.3)',
          marginBottom: 24, transition: 'all 0.2s',
        }}
      >
        {analyzing
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
          : <><Zap size={16} /> Analyze ATS Compatibility</>}
      </button>

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main Score Card */}
          <GlowCard accent={scoreColor}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* Score circle */}
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <div style={{ width: 110, height: 110, borderRadius: '50%', background: `conic-gradient(${scoreColor} ${result.score * 3.6}deg, #0b1a2e 0)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${scoreColor}44` }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#f0f6ff', lineHeight: 1 }}>{result.score}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>/ 100</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: scoreColor }}>
                    {result.score >= 70 ? 'Strong Match!' : result.score >= 45 ? 'Moderate Match' : 'Needs Improvement'}
                  </p>
                  <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 13, fontWeight: 900, background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}33` }}>
                    Grade: {result.grade}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                  {result.score >= 70
                    ? 'Your resume aligns well with this job. You are likely to pass ATS screening.'
                    : result.score >= 45
                    ? 'Your resume partially matches. Add missing keywords to improve your chances.'
                    : 'Significant keyword optimization needed. Tailor your resume specifically for this role.'}
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={13} /> {result.matched.length} keywords matched
                  </span>
                  <span style={{ fontSize: 13, color: RED, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <XCircle size={13} /> {result.missing.length} keywords missing
                  </span>
                  <span style={{ fontSize: 13, color: CYAN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Award size={13} /> {result.matchedPhrases.length} phrases matched
                  </span>
                  <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} /> {result.wordCount} words
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Score Breakdown */}
          {/* Score Breakdown */}
<GlowCard title="📊 Score Breakdown" accent={VIOLET}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {result.breakdown.map(({ label, score, max, color, pct }) => (
      <div key={label}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* ✅ Show match percentage */}
            <span style={{ fontSize: 11, color: '#475569' }}>{pct}% match</span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>
              {score} / {max} pts
            </span>
          </div>
        </div>
        <div style={{ height: 8, background: '#0b1a2e', borderRadius: 4 }}>
          <div style={{
            width: `${(score / max) * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.8s ease',
            boxShadow: `0 0 8px ${color}55`,
          }} />
        </div>
      </div>
    ))}

    {/* Total */}
    <div style={{ marginTop: 4, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Total ATS Score</span>
      <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{result.score} / 100</span>
    </div>
  </div>
</GlowCard>

          {/* Resume Sections Detected */}
          <GlowCard title="📋 Resume Sections Detected" accent={CYAN}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { key: 'hasContact',        label: 'Contact Info' },
                { key: 'hasSummary',        label: 'Summary / Objective' },
                { key: 'hasEducation',      label: 'Education' },
                { key: 'hasExperience',     label: 'Experience' },
                { key: 'hasSkills',         label: 'Skills' },
                { key: 'hasProjects',       label: 'Projects' },
                { key: 'hasCertifications', label: 'Certifications' },
                { key: 'hasQuantified',     label: 'Quantified Impact' },
              ].map(({ key, label }) => {
                const found = key === 'hasQuantified' ? result.hasQuantified : result.sections[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: found ? 'rgba(16,201,138,0.08)' : 'rgba(240,75,75,0.06)', border: `1px solid ${found ? 'rgba(16,201,138,0.2)' : 'rgba(240,75,75,0.15)'}`, borderRadius: 8 }}>
                    {found
                      ? <CheckCircle size={13} color={GREEN} style={{ flexShrink: 0 }} />
                      : <XCircle size={13} color={RED} style={{ flexShrink: 0 }} />}
                    <span style={{ fontSize: 11, color: found ? GREEN : '#64748b', fontWeight: found ? 700 : 400 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </GlowCard>

          {/* Keywords */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlowCard title="✅ Matched Keywords" accent={GREEN}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: result.matchedPhrases.length > 0 ? 10 : 0 }}>
                {result.matched.map(k => (
                  <span key={k} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(16,201,138,0.12)', color: GREEN, border: '1px solid rgba(16,201,138,0.25)' }}>
                    {k}
                  </span>
                ))}
              </div>
              {result.matchedPhrases.length > 0 && (
                <>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Matched Phrases</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.matchedPhrases.map(p => (
                      <span key={p} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(0,200,240,0.12)', color: CYAN, border: '1px solid rgba(0,200,240,0.25)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {result.matched.length === 0 && result.matchedPhrases.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>No keyword matches found.</p>
              )}
            </GlowCard>

            <GlowCard title="❌ Missing Keywords" accent={RED}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: result.missingPhrases.length > 0 ? 10 : 0 }}>
                {result.missing.map(k => (
                  <span key={k} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(240,75,75,0.12)', color: RED, border: '1px solid rgba(240,75,75,0.25)' }}>
                    {k}
                  </span>
                ))}
              </div>
              {result.missingPhrases.length > 0 && (
                <>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Missing Phrases</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.missingPhrases.slice(0, 6).map(p => (
                      <span key={p} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(245,166,35,0.12)', color: AMBER, border: '1px solid rgba(245,166,35,0.25)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {result.missing.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: GREEN, fontWeight: 700 }}>
                  ✅ No significant keywords missing!
                </p>
              )}
            </GlowCard>
          </div>

          {/* Action Verbs Used */}
          {result.usedVerbs.length > 0 && (
            <GlowCard title="💪 Action Verbs Detected" accent={GREEN}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.usedVerbs.map(v => (
                  <span key={v} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(16,201,138,0.1)', color: GREEN, border: '1px solid rgba(16,201,138,0.2)' }}>
                    {v}
                  </span>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569' }}>
                {result.usedVerbs.length >= 8
                  ? '✅ Great use of action verbs!'
                  : `Add more action verbs — aim for 10+ (developed, built, optimized, deployed, led, improved...)`}
              </p>
            </GlowCard>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <GlowCard title="💡 Improvement Suggestions" accent={AMBER}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.suggestions.map((s, i) => {
                  const style = suggestionColors[s.type] || suggestionColors.info;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: style.bg, border: `1px solid ${style.border}`, borderRadius: 9 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{style.icon}</span>
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                        <strong style={{ color: style.color }}>
                          {s.type === 'error' ? 'Required: ' : s.type === 'warning' ? 'Recommended: ' : 'Optional: '}
                        </strong>
                        {s.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Priority indicator */}
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: RED }}>🔴 Required — Fix immediately</span>
                <span style={{ fontSize: 11, color: AMBER }}>🟡 Recommended — Improves score</span>
                <span style={{ fontSize: 11, color: CYAN }}>🔵 Optional — Nice to have</span>
              </div>
            </GlowCard>
          )}

          {/* What to do next */}
          <GlowCard title="🚀 What To Do Next" accent={VIOLET}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { step: '1', title: 'Fix Required Issues', desc: 'Address all 🔴 red suggestions first — missing sections and critical keywords.', color: RED },
                { step: '2', title: 'Add Missing Keywords', desc: 'Naturally incorporate missing keywords from the JD into your experience and skills.', color: AMBER },
                { step: '3', title: 'Re-Score & Apply', desc: 'Re-paste your updated resume, target 70+ score, then apply with confidence.', color: GREEN },
              ].map(({ step, title, desc, color }) => (
                <div key={step} style={{ padding: '12px 14px', background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color, marginBottom: 8 }}>
                    {step}
                  </div>
                  <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </GlowCard>

        </div>
      )}
    </div>
  );
}

const TA = {
  width: '100%',
  background: '#071525',
  border: '1px solid rgba(0,200,240,0.15)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  outline: 'none',
  fontFamily: "'Sora',sans-serif",
  boxSizing: 'border-box',
  resize: 'vertical',
  lineHeight: 1.7,
};