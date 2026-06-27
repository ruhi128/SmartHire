// src/pages/student/MockInterview.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { interviewAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import {
  Video, Mic, Play, User, Brain,
  CheckCircle, Clock, Loader2, MicOff, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const CYAN = '#00c8f0', GREEN = '#10c98a', AMBER = '#f5a623',
      RED  = '#f04b4b', VIOLET = '#7c5cfc';

const QUESTIONS = [
  'Tell me about yourself and your technical background.',
  'What is your strongest programming language and why?',
  'Explain a challenging project you worked on. What was your role?',
  'How do you approach debugging a complex bug in production?',
  'Where do you see yourself in 5 years?',
];

// ── Speech Analysis Engine ──────────────────────────────────────────────────
function analyseAnswer(question, answerText) {
  const text      = (answerText || '').trim();
  const words     = text.split(/\s+/).filter(Boolean);
  const wc        = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const lower     = text.toLowerCase();

  // 1. Length score
  let lengthScore = 0;
  if      (wc === 0)  lengthScore = 0;
  else if (wc < 10)   lengthScore = 15;
  else if (wc < 30)   lengthScore = 40;
  else if (wc < 50)   lengthScore = 60;
  else if (wc <= 200) lengthScore = 100;
  else                lengthScore = Math.max(60, 100 - (wc - 200) * 0.2);

  // 2. Relevance score
  const keywordMap = {
    0: ['background','experience','skills','studied','worked','project','language','framework','degree','college','engineering','develop','build','learn'],
    1: ['language','python','java','javascript','c++','typescript','proficient','experience','prefer','because','performance','syntax','ecosystem','library'],
    2: ['project','team','role','challenge','built','developed','designed','architecture','problem','solution','contributed','led','managed','feature','deadline'],
    3: ['debug','log','reproduce','isolate','stack','breakpoint','test','monitor','trace','error','exception','fix','root cause','systematic','tools'],
    4: ['goal','career','grow','lead','architect','contribute','learn','team','company','impact','senior','specialize','skill','future','years','plan'],
  };
  const qIdx    = QUESTIONS.indexOf(question);
  const keys    = keywordMap[qIdx] || [];
  const matched = keys.filter(k => lower.includes(k)).length;
  const relevanceScore = keys.length > 0
    ? Math.min(100, Math.round((matched / Math.min(keys.length, 6)) * 100))
    : 50;

  // 3. Fluency score
  const fillers    = ['um','uh','like','you know','basically','literally','actually','so uh','well uh','i mean'];
  const fillerCount= fillers.reduce((n, f) => n + (lower.split(f).length - 1), 0);
  const fillerRatio= wc > 0 ? fillerCount / wc : 0;
  const fluencyScore = Math.max(0, Math.round(100 - fillerRatio * 300));

  // 4. Structure score
  const hasIntro      = /^(i |my |the |so |well |to |first|let me)/i.test(text);
  const hasConnectors = /\b(because|however|therefore|also|additionally|furthermore|finally|in conclusion|overall|for example|specifically|in particular|as a result)\b/i.test(text);
  const hasSentences  = sentences.length >= 3;
  const structureScore = Math.round(
    (hasIntro ? 30 : 0) + (hasConnectors ? 40 : 0) + (hasSentences ? 30 : 0)
  );

  // 5. Confidence score
  const uncertainPhrases = ['i think','i guess','maybe','perhaps','not sure','i don\'t know','kind of','sort of','probably','might be','i suppose'];
  const confidentPhrases  = ['i have','i built','i led','i designed','i implemented','i achieved','i know','i am','i will','i can','i created','i managed','i developed'];
  const uncertainCount    = uncertainPhrases.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);
  const confidentCount    = confidentPhrases.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);
  const confidenceScore   = wc === 0 ? 0
    : Math.min(100, Math.max(0, 50 + confidentCount * 15 - uncertainCount * 10));

  return {
    lengthScore:    Math.round(lengthScore),
    relevanceScore: Math.round(relevanceScore),
    fluencyScore:   Math.round(fluencyScore),
    structureScore: Math.round(structureScore),
    confidenceScore:Math.round(confidenceScore),
    wordCount: wc,
  };
}

function computeFinalScores(transcriptArr) {
  if (!transcriptArr || transcriptArr.length === 0)
    return { overall: 0, content: 0, fluency: 0, confidence: 0, structure: 0, relevance: 0 };

  const analyses   = transcriptArr.map(t => analyseAnswer(t.question, t.answer));
  const avg        = key => Math.round(analyses.reduce((s, a) => s + a[key], 0) / analyses.length);
  const content    = Math.round((avg('lengthScore') + avg('relevanceScore')) / 2);
  const fluency    = avg('fluencyScore');
  const confidence = avg('confidenceScore');
  const structure  = avg('structureScore');
  const relevance  = avg('relevanceScore');
  const overall    = Math.round(relevance * 0.35 + content * 0.25 + confidence * 0.25 + fluency * 0.15);
  return { overall, content, fluency, confidence, structure, relevance };
}

function generateFeedback(scores, transcriptArr) {
  const strengths = [], improvements = [], tips = [];
  if (scores.relevance  >= 70) strengths.push('Your answers were highly relevant to each question');
  if (scores.confidence >= 70) strengths.push('You spoke with confidence and assertiveness');
  if (scores.fluency    >= 70) strengths.push('Your speech was clear with minimal filler words');
  if (scores.structure  >= 70) strengths.push('Well-structured answers with clear flow');
  if (scores.content    >= 70) strengths.push('Detailed and substantive responses');
  if (scores.relevance  < 50)  improvements.push('Focus more on answering the specific question asked — use keywords from the question');
  if (scores.confidence < 50)  improvements.push('Replace uncertain phrases ("I think/maybe") with assertive language ("I built/I achieved")');
  if (scores.fluency    < 50)  improvements.push('Reduce filler words (um, uh, like, basically) — pause silently instead');
  if (scores.structure  < 50)  improvements.push('Structure your answers: Situation → Action → Result (STAR method)');
  if (scores.content    < 50)  improvements.push('Give more detailed, specific examples in your answers (aim for 60–120 words)');
  const avgWords = transcriptArr.length > 0
    ? Math.round(transcriptArr.reduce((s, t) => s + (t.answer?.split(/\s+/).filter(Boolean).length || 0), 0) / transcriptArr.length)
    : 0;
  if (avgWords < 20)            tips.push(`Your average answer was ~${avgWords} words — aim for 60–120 words per answer`);
  if (avgWords > 200)           tips.push('Try to be more concise — interviewers prefer focused 60–120 word answers');
  if (avgWords >= 60 && avgWords <= 150) tips.push(`Great answer length! Your average of ~${avgWords} words is ideal`);
  if (!strengths.length)    strengths.push('You completed all interview questions — keep practising!');
  if (!improvements.length) improvements.push('Maintain your excellent performance level');
  return { strengths, improvements, tips };
}

function getGrade(score) {
  return score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B+' :
         score >= 55 ? 'B'  : score >= 45 ? 'C' : score >= 35 ? 'D'  : 'F';
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROBUST SPEECH RECOGNITION HOOK
// ═══════════════════════════════════════════════════════════════════════════
// src/pages/student/MockInterview.jsx
// ROBUST SPEECH RECOGNITION FIX

// ═══════════════════════════════════════════════════════════════════════════
//  ROBUST SPEECH RECOGNITION HOOK (FIXED)
// ═══════════════════════════════════════════════════════════════════════════
function useSpeechRecognition() {
  const [finalText,   setFinalText]   = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error,       setError]       = useState(null);
  const [volume,      setVolume]      = useState(0);

  const recRef        = useRef(null);
  const finalRef      = useRef('');
  const activeRef     = useRef(false);
  const restartTimer  = useRef(null);
  const restartCount  = useRef(0);
  const analyserRef   = useRef(null);
  const animFrameRef  = useRef(null);
  const streamRef     = useRef(null);
  const silenceTimer  = useRef(null);
  const lastSpeechTime = useRef(Date.now());

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Volume meter via Web Audio API ──
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
        
        // Track speech activity
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

  // ── Create recognition instance with better error handling ──
  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    
    // CRITICAL FIX: Use continuous=true but handle restarts properly
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    // Chrome-specific fixes
    if (rec.grammars) {
      // Adding a dummy grammar can help keep connection alive
      const grammar = '#JSGF V1.0; grammar dummy; public <dummy> = hello;';
      const speechRecognitionList = new window.SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      rec.grammars = speechRecognitionList;
    }

    return rec;
  }, []);

  // ── Start recognition with keepalive ──
  const startRecognition = useCallback(() => {
    if (!activeRef.current) return;

    // Clear any existing instance
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.onerror = null;
        recRef.current.onresult = null;
        recRef.current.onaudiostart = null;
        recRef.current.onaudioend = null;
        recRef.current.onspeechstart = null;
        recRef.current.onspeechend = null;
        recRef.current.onsoundstart = null;
        recRef.current.onsoundend = null;
        recRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
      recRef.current = null;
    }

    // Clear restart timers
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    restartCount.current = 0;

    // ── Event Handlers ──
    
    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      lastSpeechTime.current = Date.now();
      console.log('🎤 Recognition started');
    };

    rec.onaudiostart = () => {
      // Audio is being captured
    };

    rec.onspeechstart = () => {
      // User started speaking
      lastSpeechTime.current = Date.now();
    };

    rec.onspeechend = () => {
      // User stopped speaking - Chrome sometimes stops here
      lastSpeechTime.current = Date.now();
    };

    rec.onsoundstart = () => {
      // Sound detected
    };

    rec.onsoundend = () => {
      // Sound ended
    };

    rec.onresult = (event) => {
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (newFinal) {
        const updated = (finalRef.current + ' ' + newFinal).replace(/\s+/g, ' ').trim();
        finalRef.current = updated;
        setFinalText(updated);
      }
      setInterimText(interim);
      lastSpeechTime.current = Date.now();
    };

    rec.onerror = (event) => {
      console.log('🎤 Recognition error:', event.error, event.message);

      switch (event.error) {
        case 'no-speech':
          // Normal - just restart
          break;
        case 'aborted':
          // Intentional abort or Chrome being Chrome
          if (activeRef.current) {
            // Chrome sometimes aborts randomly - restart
            restartTimer.current = setTimeout(startRecognition, 200);
          }
          return;
        case 'audio-capture':
          setError('No microphone found. Please check your mic connection.');
          activeRef.current = false;
          setIsListening(false);
          return;
        case 'not-allowed':
          setError('Microphone permission denied. Please allow mic access in browser settings.');
          activeRef.current = false;
          setIsListening(false);
          return;
        case 'network':
          // Network error - retry with backoff
          if (activeRef.current && restartCount.current < 10) {
            const delay = Math.min(1000 * Math.pow(1.5, restartCount.current), 10000);
            restartTimer.current = setTimeout(startRecognition, delay);
            restartCount.current++;
          } else {
            setError('Network error. Please check your connection.');
            activeRef.current = false;
            setIsListening(false);
          }
          return;
        case 'bad-grammar':
        case 'language-not-supported':
          setError('Speech recognition not supported for English. Try a different browser.');
          activeRef.current = false;
          setIsListening(false);
          return;
        default:
          break;
      }
    };

    rec.onend = () => {
      setInterimText('');
      
      if (activeRef.current) {
        // Always restart with a small delay
        const delay = restartCount.current > 5 ? 1000 : 200;
        restartTimer.current = setTimeout(() => {
          restartCount.current++;
          startRecognition();
        }, delay);
        
        // Keep alive: if no restart happens, force one
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
          if (activeRef.current && !recRef.current) {
            startRecognition();
          }
        }, 3000);
      } else {
        setIsListening(false);
      }
    };

    try {
      rec.start();
    } catch (err) {
      // Already started or other error
      if (activeRef.current) {
        restartTimer.current = setTimeout(startRecognition, 300);
      }
    }
  }, [createRecognition]);

  // ── Public API ──
  
  const start = useCallback((existingText = '') => {
    if (!isSupported) {
      setError('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }

    // Reset state
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
    
    // Clear all timers
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    
    // Stop recognition
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.onerror = null;
        recRef.current.onresult = null;
        recRef.current.stop();
      } catch (e) {
        // Ignore
      }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
      }
      stopVolumeMeter();
    };
  }, []);

  const fullText = (finalText + (interimText ? ' ' + interimText : '')).trim();

  return { 
    start, stop, reset, 
    finalText, interimText, fullText, 
    isListening, error, volume, 
    isSupported, finalRef 
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MockInterview() {
  const [phase,         setPhase]         = useState('setup');
  const [camReady,      setCamReady]      = useState(false);
  const [micReady,      setMicReady]      = useState(false);
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [isActive,      setIsActive]      = useState(false);
  const [currentQ,      setCurrentQ]      = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [faceMetrics,   setFaceMetrics]   = useState({ faceDetected: false, expression: 'neutral' });
  const [expressionLog, setExpressionLog] = useState([]);
  const [transcript,    setTranscript]    = useState([]);
  const [answerScores,  setAnswerScores]  = useState([]);
  const [result,        setResult]        = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const timerRef     = useRef(null);
  const detectRef    = useRef(null);
  const faceapi      = useRef(null);
  const transcriptRef= useRef([]);

  const stt = useSpeechRecognition();

  // ── Load face-api ──
  useEffect(() => {
    const load = async () => {
      try {
        const fa = await import('face-api.js');
        faceapi.current = fa;
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri('/models'),
          fa.nets.faceExpressionNet.loadFromUri('/models'),
          fa.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
        setFaceApiLoaded(true);
      } catch {
        setModelsLoaded(true);
        setFaceApiLoaded(false);
      }
    };
    load();
    return () => { stopCamera(); stt.stop(); };
  }, []);

  // ── Reattach stream when phase → interview ──
  useEffect(() => {
    if (phase === 'interview' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // ── Timer ──
  useEffect(() => {
    if (!isActive) return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  // ── Face detection ──
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

  // ── Camera ──
  const startCamera = async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamReady(true); setMicReady(true);
      toast.success('Camera and mic ready');
    } catch {
      toast.error('Could not access camera — check browser permissions');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    clearInterval(detectRef.current);
  }, []);

  // ── Interview flow ──
  const startInterview = () => {
    transcriptRef.current = [];
    setTranscript([]);
    setAnswerScores([]);
    setExpressionLog([]);
    setElapsed(0);
    setCurrentQ(0);
    setIsActive(true);
    stt.reset();
    stt.start();
    setPhase('interview');
  };

  const saveCurrentAnswer = useCallback(() => {
    // Use the ref for guaranteed latest value
    const answer = stt.finalRef.current.trim() || '(No answer recorded)';
    const entry  = { question: QUESTIONS[currentQ], answer, timestamp: elapsed };
    const scores = analyseAnswer(QUESTIONS[currentQ], answer);

    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(prev    => [...prev, entry]);
    setAnswerScores(prev  => [...prev, { ...scores, question: QUESTIONS[currentQ], answer }]);

    // Reset STT buffer for next question
    stt.reset();

    return transcriptRef.current;
  }, [currentQ, elapsed, stt]);

  const nextQuestion = useCallback(() => {
    saveCurrentAnswer();
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      finishInterview();
    }
  }, [currentQ, saveCurrentAnswer]);

  const finishInterview = useCallback(async () => {
    clearInterval(timerRef.current);
    clearInterval(detectRef.current);
    stt.stop();
    setIsActive(false);

    const finalTranscript = saveCurrentAnswer();
    const speechScores    = computeFinalScores(finalTranscript);

    const log         = expressionLog;
    const faceAvg     = key => log.length
      ? Math.round(log.reduce((s, e) => s + (e[key] || 0), 0) / log.length)
      : null;

    const fEye  = faceAvg('eyeContact');
    const fAtt  = faceAvg('attention');
    const fStr  = faceAvg('stress');

    const finalResult = {
      overallScore:    speechScores.overall,
      contentScore:    speechScores.content,
      fluencyScore:    speechScores.fluency,
      confidenceScore: speechScores.confidence,
      structureScore:  speechScores.structure,
      relevanceScore:  speechScores.relevance,
      eyeContactScore: fEye !== null ? Math.round(speechScores.confidence * 0.7 + fEye * 0.3) : speechScores.confidence,
      attentionScore:  fAtt !== null ? Math.round(speechScores.structure  * 0.7 + fAtt * 0.3) : speechScores.structure,
      stressScore:     fStr !== null ? Math.round((100 - speechScores.fluency) * 0.7 + fStr * 0.3) : Math.max(0, 100 - speechScores.fluency),
      duration:        elapsed,
      grade:           getGrade(speechScores.overall),
      feedback:        generateFeedback(speechScores, finalTranscript),
    };
    setResult(finalResult);

    setSaving(true);
    try {
      await interviewAPI.save({
        durationSeconds:  elapsed,
        overallScore:     finalResult.overallScore,
        eyeContactScore:  finalResult.eyeContactScore,
        confidenceScore:  finalResult.confidenceScore,
        attentionScore:   finalResult.attentionScore,
        stressScore:      finalResult.stressScore,
        transcript:       finalTranscript,
        expressionLog:    log.slice(-20),
        aiFeedback: {
          strengths:    finalResult.feedback.strengths,
          improvements: finalResult.feedback.improvements,
          tips:         finalResult.feedback.tips,
          scores:       speechScores,
        },
      });
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
    stopCamera();
    setPhase('result');
  }, [elapsed, expressionLog, saveCurrentAnswer, stt, stopCamera]);

  const resetAll = () => {
    setPhase('setup'); setCamReady(false); setMicReady(false);
    setTranscript([]); setAnswerScores([]); setResult(null);
    setElapsed(0); setCurrentQ(0); setExpressionLog([]);
    transcriptRef.current = [];
    stt.reset();
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Live analysis of what's been spoken so far
  const liveScores = analyseAnswer(QUESTIONS[currentQ] || '', stt.fullText);

  /* ═══════════════════════════════════════════════════════════
     SETUP SCREEN
  ════════════════════════════════════════════════════════════ */
  if (phase === 'setup') return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={H1}>Mock Interview</h1>
        <p style={SUB}>AI-powered interview — your spoken answers are analysed for relevance, fluency, confidence & structure</p>
      </div>

      {/* STT not supported warning */}
      {!stt.isSupported && (
        <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(240,75,75,0.08)', border: '1px solid rgba(240,75,75,0.25)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color={RED} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#f04b4b' }}>
            <strong>Speech recognition not available in this browser.</strong><br />
            Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best experience.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <GlowCard title="Camera Preview" accent={CYAN}>
          <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', marginBottom: 16 }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline autoPlay />
            {!camReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <User size={40} color="#334155" />
                <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Camera not started</p>
              </div>
            )}
            {camReady && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,201,138,0.15)', border: '1px solid rgba(16,201,138,0.3)', borderRadius: 6, padding: '3px 8px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>LIVE</span>
              </div>
            )}
          </div>
          <button
            style={{ ...BTN, width: '100%', background: camReady ? 'rgba(0,200,240,0.1)' : CYAN, color: camReady ? CYAN : '#040c18', border: `1px solid ${CYAN}` }}
            onClick={startCamera}
          >
            {camReady ? <><CheckCircle size={15} /> Camera Ready</> : <><Video size={15} /> Start Camera</>}
          </button>
        </GlowCard>

        <GlowCard title="Interview Setup" accent={VIOLET}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={infoBox(CYAN)}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: CYAN }}>📋 How scoring works</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
                Your spoken answers are transcribed and analysed for:<br />
                <strong style={{ color: VIOLET }}>Relevance</strong> · <strong style={{ color: GREEN }}>Fluency</strong> · <strong style={{ color: CYAN }}>Confidence</strong> · <strong style={{ color: AMBER }}>Structure</strong>
              </p>
            </div>
            {[
              { label: 'Camera',             ready: camReady,          icon: <Video size={14} /> },
              { label: 'Microphone',         ready: micReady,          icon: <Mic size={14} /> },
              { label: 'AI Models',          ready: modelsLoaded,      icon: <Brain size={14} /> },
              { label: 'Speech Recognition', ready: stt.isSupported,   icon: <Mic size={14} /> },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                  {item.icon}{item.label}
                </div>
                {item.ready
                  ? <span style={{ fontSize: 12, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} />Ready</span>
                  : <span style={{ fontSize: 12, color: RED }}>Not available</span>}
              </div>
            ))}
            <button
              style={{ ...BTN, background: camReady && modelsLoaded ? GREEN : '#0f2040', color: camReady && modelsLoaded ? '#040c18' : '#334155', border: 'none', marginTop: 4 }}
              disabled={!camReady || !modelsLoaded}
              onClick={startInterview}
            >
              <Play size={15} /> Start Interview
            </button>
          </div>
        </GlowCard>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { icon: '🎯', t: 'Relevance',  d: 'Answer the actual question asked' },
          { icon: '🗣️', t: 'Fluency',    d: 'Avoid um, uh, like, basically' },
          { icon: '💪', t: 'Confidence', d: 'Say "I built X" not "I think maybe"' },
          { icon: '📐', t: 'Structure',  d: 'Use STAR: Situation → Action → Result' },
        ].map(tip => (
          <div key={tip.t} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <p style={{ margin: '0 0 4px', fontSize: 20 }}>{tip.icon}</p>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{tip.t}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{tip.d}</p>
          </div>
        ))}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     INTERVIEW SCREEN
  ════════════════════════════════════════════════════════════ */
  if (phase === 'interview') return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1a2e', border: '1px solid rgba(0,200,240,0.12)', borderRadius: 12, padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Live Interview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color={AMBER} />
          <span style={{ fontSize: 16, fontWeight: 800, color: AMBER, fontFamily: 'monospace' }}>{fmt(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mic status + volume bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: stt.isListening ? 'rgba(16,201,138,0.1)' : 'rgba(240,75,75,0.1)', border: `1px solid ${stt.isListening ? GREEN : RED}33`, borderRadius: 8 }}>
            {stt.isListening
              ? <Mic size={12} color={GREEN} />
              : <MicOff size={12} color={RED} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: stt.isListening ? GREEN : RED }}>
              {stt.isListening ? 'Listening' : 'Reconnecting…'}
            </span>
            {/* Volume bars */}
            {stt.isListening && (
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                {[0.25, 0.5, 0.75, 1].map((thresh, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 2, height: `${(i + 1) * 3 + 2}px`, background: stt.volume / 100 >= thresh ? GREEN : 'rgba(255,255,255,0.1)', transition: 'background 0.1s' }} />
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#475569' }}>Q {currentQ + 1} / {QUESTIONS.length}</span>
        </div>
      </div>

      {stt.error && (
        <div style={{ padding: '10px 14px', background: 'rgba(240,75,75,0.08)', border: '1px solid rgba(240,75,75,0.2)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} color={RED} />
          <span style={{ fontSize: 12, color: RED }}>{stt.error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14 }}>

        {/* Left: camera + live analysis */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline autoPlay />
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${CYAN}88,transparent)`, animation: 'scanLine 3s linear infinite' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: faceMetrics.faceDetected ? GREEN : RED, boxShadow: `0 0 6px ${faceMetrics.faceDetected ? GREEN : RED}` }} />
              <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>
                {faceMetrics.faceDetected ? `${faceMetrics.expression}` : '⚠Face Detected '}
              </span>
            </div>
          </div>

          {/* Live answer analysis */}
          <GlowCard accent={VIOLET}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Live Analysis</p>
            <MetricBar label="Relevance"   value={liveScores.relevanceScore}  color={VIOLET} />
            <MetricBar label="Fluency"     value={liveScores.fluencyScore}    color={GREEN} />
            <MetricBar label="Confidence"  value={liveScores.confidenceScore} color={CYAN} />
            <MetricBar label="Structure"   value={liveScores.structureScore}  color={AMBER} />
            <div style={{ marginTop: 8, padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#475569' }}>Words spoken</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: liveScores.wordCount >= 50 ? GREEN : liveScores.wordCount >= 20 ? AMBER : RED }}>
                {liveScores.wordCount} / 60+
              </span>
            </div>
          </GlowCard>
        </div>

        {/* Right: question + transcript */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GlowCard accent={VIOLET}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${VIOLET}22`, border: `2px solid ${VIOLET}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: VIOLET }}>
                {currentQ + 1}
              </div>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Interview Question</span>
            </div>

            <p style={{ fontSize: 19, color: '#f0f6ff', lineHeight: 1.7, fontWeight: 600, margin: '0 0 10px' }}>
              {QUESTIONS[currentQ]}
            </p>
            <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '0 0 12px' }}>
              💡 Tip: Use specific examples. Aim for 60–120 words. Say "I built X" not "I think maybe X".
            </p>

            {/* Live transcription box */}
            <div style={{ background: 'rgba(0,200,240,0.04)', border: `1px solid ${stt.isListening ? 'rgba(0,200,240,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, minHeight: 90, transition: 'border-color 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: stt.isListening ? GREEN : '#334155', ...(stt.isListening ? { animation: 'pulse 1s infinite' } : {}) }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎤 Your Answer (Live Transcription)
                </span>
                {stt.finalText && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#334155' }}>
                    {stt.finalText.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>

              {/* Final text (confirmed) */}
              {stt.finalText && (
                <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                  {stt.finalText}
                </p>
              )}

              {/* Interim text (being spoken right now) */}
              {stt.interimText && (
                <p style={{ margin: stt.finalText ? '4px 0 0' : 0, fontSize: 13, color: '#475569', lineHeight: 1.7, fontStyle: 'italic' }}>
                  {stt.interimText}…
                </p>
              )}

              {/* Placeholder */}
              {!stt.finalText && !stt.interimText && (
                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.7, fontStyle: 'italic' }}>
                  {stt.isListening
                    ? 'Start speaking — your answer will appear here in real time…'
                    : 'Connecting microphone…'}
                </p>
              )}
            </div>

            <button
              style={{ ...BTN, background: currentQ < QUESTIONS.length - 1 ? VIOLET : GREEN, color: '#fff', border: 'none' }}
              onClick={nextQuestion}
            >
              {currentQ < QUESTIONS.length - 1 ? 'Save Answer & Next →' : '🏁 Save & Finish Interview'}
            </button>
          </GlowCard>

          {/* Previous answers log */}
          {transcript.length > 0 && (
            <GlowCard title={`Saved Answers (${transcript.length}/${QUESTIONS.length})`} accent={GREEN}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                {transcript.map((t, i) => {
                  const sc = answerScores[i];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'rgba(16,201,138,0.05)', border: '1px solid rgba(16,201,138,0.12)', borderRadius: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, width: 20, flexShrink: 0 }}>Q{i + 1}</span>
                      <span style={{ fontSize: 12, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.answer}</span>
                      {sc && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: sc.relevanceScore >= 60 ? GREEN : sc.relevanceScore >= 30 ? AMBER : RED, flexShrink: 0 }}>
                          {sc.relevanceScore}% rel.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     RESULT SCREEN
  ════════════════════════════════════════════════════════════ */
  if (phase === 'result') return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 36, margin: '0 0 8px' }}>
          {(result?.overallScore || 0) >= 70 ? '🎉' : (result?.overallScore || 0) >= 40 ? '👍' : '📚'}
        </p>
        <h1 style={H1}>Interview Complete!</h1>
        <p style={SUB}>Score is based entirely on your spoken answers</p>
      </div>

      <GlowCard accent={result?.overallScore >= 70 ? GREEN : result?.overallScore >= 40 ? AMBER : RED} style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: `conic-gradient(${result?.overallScore >= 70 ? GREEN : result?.overallScore >= 40 ? AMBER : RED} ${(result?.overallScore || 0) * 3.6}deg, #0b1a2e 0)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 30px ${result?.overallScore >= 70 ? GREEN : AMBER}44` }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#f0f6ff' }}>{result?.overallScore}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>/ 100</span>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#f0f6ff' }}>Grade: {result?.grade}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Duration: {fmt(result?.duration || 0)}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { l: 'Answer Relevance',  v: result?.relevanceScore,  c: VIOLET, desc: 'How directly you answered each question' },
            { l: 'Content Quality',   v: result?.contentScore,    c: CYAN,   desc: 'Detail, depth and word count' },
            { l: 'Spoken Confidence', v: result?.confidenceScore, c: GREEN,  desc: 'Assertive vs uncertain language' },
            { l: 'Speech Fluency',    v: result?.fluencyScore,    c: AMBER,  desc: 'Clarity and minimal filler words' },
            { l: 'Answer Structure',  v: result?.structureScore,  c: VIOLET, desc: 'Intro → body → conclusion' },
            { l: 'Eye Contact',       v: result?.eyeContactScore, c: CYAN,   desc: faceApiLoaded ? 'Face-api analysis' : 'Based on confidence' },
          ].map(m => (
            <div key={m.l} style={{ padding: '12px 14px', background: `${m.c}08`, border: `1px solid ${m.c}18`, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{m.l}</p>
                <span style={{ fontSize: 20, fontWeight: 900, color: m.c }}>{m.v}%</span>
              </div>
              <div style={{ height: 4, background: '#0b1a2e', borderRadius: 2, marginBottom: 6 }}>
                <div style={{ width: `${m.v}%`, height: '100%', background: m.c, borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#334155' }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Per-question breakdown */}
      <GlowCard title="Question-by-Question Breakdown" accent={CYAN} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {answerScores.map((sc, i) => (
            <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0', flex: 1, paddingRight: 12 }}>Q{i + 1}: {QUESTIONS[i]}</p>
                <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0, color: sc.relevanceScore >= 60 ? GREEN : sc.relevanceScore >= 30 ? AMBER : RED }}>
                  {sc.relevanceScore}%
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b', lineHeight: 1.6, fontStyle: sc.answer === '(No answer recorded)' ? 'italic' : 'normal' }}>
                "{sc.answer?.length > 150 ? sc.answer.slice(0, 150) + '…' : sc.answer}"
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { l: 'Words',      v: `${sc.wordCount}`,        c: sc.wordCount >= 50 ? GREEN : sc.wordCount >= 20 ? AMBER : RED },
                  { l: 'Relevance',  v: `${sc.relevanceScore}%`,  c: sc.relevanceScore  >= 60 ? GREEN : AMBER },
                  { l: 'Fluency',    v: `${sc.fluencyScore}%`,    c: sc.fluencyScore    >= 60 ? GREEN : AMBER },
                  { l: 'Confidence', v: `${sc.confidenceScore}%`, c: sc.confidenceScore >= 60 ? GREEN : AMBER },
                  { l: 'Structure',  v: `${sc.structureScore}%`,  c: sc.structureScore  >= 60 ? GREEN : AMBER },
                ].map(tag => (
                  <span key={tag.l} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: `${tag.c}12`, color: tag.c, border: `1px solid ${tag.c}25`, fontWeight: 600 }}>
                    {tag.l}: {tag.v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Feedback */}
      <GlowCard title="AI Feedback" accent={VIOLET} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: GREEN }}>✅ Strengths</p>
            {result?.feedback?.strengths?.map((s, i) => (
              <p key={i} style={{ margin: '0 0 7px', fontSize: 13, color: '#94a3b8', paddingLeft: 12, borderLeft: `2px solid ${GREEN}44`, lineHeight: 1.6 }}>{s}</p>
            ))}
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: AMBER }}>🎯 Areas to Improve</p>
            {result?.feedback?.improvements?.map((s, i) => (
              <p key={i} style={{ margin: '0 0 7px', fontSize: 13, color: '#94a3b8', paddingLeft: 12, borderLeft: `2px solid ${AMBER}44`, lineHeight: 1.6 }}>{s}</p>
            ))}
          </div>
          {result?.feedback?.tips?.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: CYAN }}>💡 Tips</p>
              {result?.feedback?.tips?.map((s, i) => (
                <p key={i} style={{ margin: '0 0 7px', fontSize: 13, color: '#94a3b8', paddingLeft: 12, borderLeft: `2px solid ${CYAN}44`, lineHeight: 1.6 }}>{s}</p>
              ))}
            </div>
          )}
        </div>
      </GlowCard>

      <div style={{ display: 'flex', gap: 12 }}>
        <button style={{ ...BTN, flex: 1, background: CYAN, color: '#040c18', border: 'none' }} onClick={resetAll}>
          Practice Again
        </button>
        <button style={{ ...BTN, flex: 1, background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => window.location.href = '/student/dashboard'}>
          Back to Dashboard
        </button>
      </div>

      {saving && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 12 }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving session…
        </p>
      )}
    </div>
  );

  return null;
}

const BTN     = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif" };
const H1      = { margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" };
const SUB     = { margin: '6px 0 0', fontSize: 13, color: '#475569' };
const infoBox = c => ({ background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 10, padding: '12px 14px' });

function MetricBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(value || 0)}%</span>
      </div>
      <div style={{ height: 5, background: '#0f2040', borderRadius: 3 }}>
        <div style={{ width: `${value || 0}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${color}55` }} />
      </div>
    </div>
  );
}