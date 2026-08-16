// src/components/ProctorLayer.jsx
// Self-contained proctoring layer for Mock OA exams.
// Enforces fullscreen, detects tab-switch / blur, blocks copy-paste,
// and runs webcam face-presence detection via face-api.js (tinyFaceDetector).
// All violations are reported through onViolation; onTerminate fires when the
// hard-strike threshold is reached (parent should auto-submit).
import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';
import { AlertTriangle, Camera, CameraOff, Maximize, ShieldCheck, ShieldAlert } from 'lucide-react';

const MODEL_URL = `${process.env.PUBLIC_URL || ''}/models`;

// How much each violation type subtracts from the 100-point integrity score.
export const VIOLATION_WEIGHTS = {
  tab_switch: 8, fullscreen_exit: 8, multiple_faces: 12, no_face: 4,
  copy: 4, cut: 4, paste: 6, context_menu: 2, camera_blocked: 10,
};

export function computeIntegrity(violations) {
  const penalty = violations.reduce((s, v) => s + (VIOLATION_WEIGHTS[v.type] || 3), 0);
  return Math.max(0, 100 - penalty);
}

export default function ProctorLayer({
  active,
  onViolation,
  onTerminate,
  maxHardStrikes = 3,
  requireCamera = true,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsModal, setShowFsModal] = useState(false);
  const [hardStrikes, setHardStrikes] = useState(0);
  const [camStatus, setCamStatus] = useState('loading'); // loading|ready|denied|error|no_face|multi_face
  const [banner, setBanner] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimer = useRef(null);
  const settlingRef = useRef(true);       // ignore blur/fs during initial camera-permission settle
  const faceStateRef = useRef('ok');       // last face state to throttle repeat violations
  const bannerTimer = useRef(null);
  const strikesRef = useRef(0);

  // Keep latest callbacks without re-binding listeners.
  const onViolationRef = useRef(onViolation);
  const onTerminateRef = useRef(onTerminate);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onTerminateRef.current = onTerminate; }, [onTerminate]);

  const flashBanner = useCallback((msg) => {
    setBanner(msg);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3500);
  }, []);

  const record = useCallback((type, detail, { hard = false, silent = false } = {}) => {
    const v = { type, detail: detail || '', at: Date.now() };
    onViolationRef.current && onViolationRef.current(v);
    if (!silent) {
      flashBanner(detail || type);
      toast.error(detail || `Proctoring: ${type}`, { id: `proctor-${type}`, duration: 2500 });
    }
    if (hard) {
      strikesRef.current += 1;
      setHardStrikes(strikesRef.current);
      if (strikesRef.current >= maxHardStrikes) {
        toast.error('Too many violations — the exam is being auto-submitted.', { id: 'proctor-terminate' });
        onTerminateRef.current && onTerminateRef.current();
      }
    }
  }, [flashBanner, maxHardStrikes]);

  const goFullscreen = useCallback(() => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }, []);

  // ── Master effect: wire everything while active ─────────────────────────
  useEffect(() => {
    if (!active) return;

    strikesRef.current = 0;
    setHardStrikes(0);
    settlingRef.current = true;
    faceStateRef.current = 'ok';
    const settleTimer = setTimeout(() => { settlingRef.current = false; }, 2500);

    // Attempt fullscreen (parent also requests it on the start click as a gesture).
    goFullscreen();

    const fsElement = () =>
      document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    const onFsChange = () => {
      const fs = !!fsElement();
      setIsFullscreen(fs);
      if (!fs && !settlingRef.current) {
        setShowFsModal(true);
        record('fullscreen_exit', 'You exited full-screen mode', { hard: true });
      } else if (fs) {
        setShowFsModal(false);
      }
    };

    const onBlurOrHide = (reason) => {
      if (settlingRef.current) return;
      record('tab_switch', reason || 'You switched away from the exam tab', { hard: true });
    };
    const onWindowBlur = () => onBlurOrHide('Window lost focus');
    const onVisibility = () => { if (document.hidden) onBlurOrHide('You left the exam tab'); };

    const blockClipboard = (e) => {
      e.preventDefault();
      const t = e.type; // copy | cut | paste
      record(t, `${t.charAt(0).toUpperCase() + t.slice(1)} is disabled during the exam`);
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      record('context_menu', 'Right-click is disabled during the exam', { silent: true });
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('contextmenu', onContextMenu);

    setIsFullscreen(!!fsElement());

    // ── Camera + face detection ───────────────────────────────────────────
    let cancelled = false;
    async function startCamera() {
      if (!requireCamera) { setCamStatus('ready'); return; }
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      } catch (err) {
        if (!cancelled) { setCamStatus('error'); record('camera_blocked', 'Face-detection model failed to load', { silent: true }); }
        // continue without face detection; camera stream may still show
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setCamStatus(s => (s === 'error' ? 'error' : 'ready'));
      } catch (err) {
        if (!cancelled) { setCamStatus('denied'); record('camera_blocked', 'Camera access was blocked'); }
        return;
      }

      if (camStatusIsModelReady()) {
        detectTimer.current = setInterval(runDetection, 3000);
      }
    }

    function camStatusIsModelReady() {
      return faceapi.nets.tinyFaceDetector.isLoaded;
    }

    async function runDetection() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
        const faces = await faceapi.detectAllFaces(video, opts);
        const n = faces.length;
        if (n === 0) {
          if (faceStateRef.current !== 'no_face') {
            faceStateRef.current = 'no_face';
            setCamStatus('no_face');
            record('no_face', 'No face detected — stay in front of the camera');
          }
        } else if (n > 1) {
          if (faceStateRef.current !== 'multi_face') {
            faceStateRef.current = 'multi_face';
            setCamStatus('multi_face');
            record('multiple_faces', `${n} faces detected — only you should be visible`);
          }
        } else {
          faceStateRef.current = 'ok';
          setCamStatus('ready');
        }
      } catch (_) { /* transient */ }
    }

    startCamera();

    return () => {
      clearTimeout(settleTimer);
      clearInterval(detectTimer.current);
      clearTimeout(bannerTimer.current);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('contextmenu', onContextMenu);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) exit.call(document).catch(() => {});
    };
  }, [active, goFullscreen, record, requireCamera]);

  if (!active) return null;

  const camMeta = {
    loading:    { color: '#64748b', ring: '#64748b', label: 'Starting camera…', Icon: Camera },
    ready:      { color: '#16a34a', ring: '#16a34a', label: 'Face OK', Icon: ShieldCheck },
    no_face:    { color: '#d97706', ring: '#d97706', label: 'No face detected', Icon: ShieldAlert },
    multi_face: { color: '#dc2626', ring: '#dc2626', label: 'Multiple faces', Icon: ShieldAlert },
    denied:     { color: '#dc2626', ring: '#dc2626', label: 'Camera blocked', Icon: CameraOff },
    error:      { color: '#dc2626', ring: '#dc2626', label: 'Face model error', Icon: CameraOff },
  }[camStatus] || { color: '#64748b', ring: '#64748b', label: 'Camera', Icon: Camera };
  const CamIcon = camMeta.Icon;

  return (
    <>
      {/* Proctoring status strip */}
      {banner && (
        <div style={{ background:'rgba(220,38,38,0.10)', border:'1px solid rgba(220,38,38,0.4)', padding:'9px 24px', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#dc2626', fontWeight:700 }}>
          <AlertTriangle size={16}/> {banner} · Strike {Math.min(hardStrikes, maxHardStrikes)}/{maxHardStrikes}
        </div>
      )}

      {/* Camera PIP */}
      {requireCamera && (
        <div style={{ position:'fixed', bottom:18, right:18, zIndex:1200, width:168, borderRadius:14, overflow:'hidden', background:'#0f172a', border:`2px solid ${camMeta.ring}`, boxShadow:'0 8px 24px rgba(15,23,42,0.28)' }}>
          <video ref={videoRef} muted playsInline style={{ width:'100%', height:118, objectFit:'cover', display:'block', transform:'scaleX(-1)', background:'#0f172a' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 9px', background:'#0f172a' }}>
            <CamIcon size={13} color={camMeta.color}/>
            <span style={{ fontSize:11, fontWeight:700, color:camMeta.color }}>{camMeta.label}</span>
            <span style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:camMeta.ring, boxShadow:`0 0 6px ${camMeta.ring}` }}/>
          </div>
        </div>
      )}

      {/* Fullscreen re-entry lock */}
      {showFsModal && (
        <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(15,23,42,0.82)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:420, maxWidth:'90vw', background:'#ffffff', borderRadius:18, padding:32, textAlign:'center', boxShadow:'0 24px 60px rgba(15,23,42,0.4)' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'rgba(220,38,38,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <ShieldAlert size={28} color="#dc2626"/>
            </div>
            <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'#0f172a', fontFamily:"'Sora',sans-serif" }}>Full-screen required</h2>
            <p style={{ margin:'0 0 6px', fontSize:14, color:'#475569', lineHeight:1.6 }}>
              You left full-screen mode. This is recorded as a proctoring violation.
              Return to full-screen to continue your exam.
            </p>
            <p style={{ margin:'0 0 20px', fontSize:12, color:'#dc2626', fontWeight:700 }}>
              Strike {Math.min(hardStrikes, maxHardStrikes)} of {maxHardStrikes} — the exam auto-submits after {maxHardStrikes}.
            </p>
            <button onClick={() => { goFullscreen(); setShowFsModal(false); }}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'#4f46e5', color:'#ffffff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
              <Maximize size={16}/> Return to full-screen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
