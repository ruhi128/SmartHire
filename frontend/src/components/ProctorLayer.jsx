// src/components/ProctorLayer.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { loadFaceApi } from '../utils/loadFaceApi';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Maximize,
  ShieldCheck,
  ShieldAlert,
  GripHorizontal,
  Minimize2,
  Maximize2,
} from 'lucide-react';

const MODEL_URL = `${process.env.PUBLIC_URL || ''}/models`;

export const VIOLATION_WEIGHTS = {
  tab_switch: 8,
  fullscreen_exit: 8,
  multiple_faces: 12,
  no_face: 4,
  copy: 4,
  cut: 4,
  paste: 6,
  context_menu: 2,
  camera_blocked: 10,
};

export function computeIntegrity(violations) {
  const penalty = violations.reduce(
    (sum, violation) => sum + (VIOLATION_WEIGHTS[violation.type] || 3),
    0
  );
  return Math.max(0, 100 - penalty);
}

export default function ProctorLayer({
  active,
  onViolation,
  onTerminate,
  maxHardStrikes = 3,
  requireCamera = true,
}) {
  const [showFsModal, setShowFsModal] = useState(false);
  const [hardStrikes, setHardStrikes] = useState(0);
  const [camStatus, setCamStatus] = useState('loading');
  const [banner, setBanner] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [camPos, setCamPos] = useState({ x: 20, y: 72 });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const settlingRef = useRef(true);
  const faceStateRef = useRef('ok');
  const strikesRef = useRef(0);
  const terminatedRef = useRef(false);
  const lastTabViolationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, camX: 20, camY: 72 });
  const dragCleanupRef = useRef(null);

  const onViolationRef = useRef(onViolation);
  const onTerminateRef = useRef(onTerminate);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    onTerminateRef.current = onTerminate;
  }, [onTerminate]);

  const flashBanner = useCallback((message) => {
    setBanner(message);
    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), 3500);
  }, []);

  const record = useCallback(
    (type, detail, { hard = false, silent = false } = {}) => {
      if (terminatedRef.current) return;

      const violation = {
        type,
        detail: detail || '',
        at: Date.now(),
      };

      onViolationRef.current?.(violation);

      if (!silent) {
        flashBanner(detail || type);
        toast.error(detail || `Proctoring: ${type}`, {
          id: `proctor-${type}`,
          duration: 2500,
        });
      }

      if (hard) {
        strikesRef.current += 1;
        setHardStrikes(strikesRef.current);

        if (strikesRef.current >= maxHardStrikes) {
          terminatedRef.current = true;
          toast.error('Too many violations — the exam is being auto-submitted.', {
            id: 'proctor-terminate',
          });
          onTerminateRef.current?.();
        }
      }
    },
    [flashBanner, maxHardStrikes]
  );

  const goFullscreen = useCallback(() => {
    const element = document.documentElement;
    const request =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.msRequestFullscreen;

    if (!request) return;

    try {
      Promise.resolve(request.call(element)).catch(() => {});
    } catch (_) {
      // The re-entry modal remains visible if fullscreen cannot be entered.
    }
  }, []);

  const handleDragStart = (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      camX: camPos.x,
      camY: camPos.y,
    };
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;

      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;

      setCamPos({
        x: Math.max(
          8,
          Math.min(window.innerWidth - 180, dragStartRef.current.camX + dx)
        ),
        y: Math.max(
          50,
          Math.min(window.innerHeight - 80, dragStartRef.current.camY + dy)
        ),
      });
    };

    const cleanupDrag = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanupDrag);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanupDrag;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanupDrag);
  };

  useEffect(() => {
    if (!active) return undefined;

    strikesRef.current = 0;
    terminatedRef.current = false;
    lastTabViolationRef.current = 0;
    settlingRef.current = true;
    faceStateRef.current = 'ok';

    setHardStrikes(0);
    setShowFsModal(false);
    setCamStatus('loading');

    const fullscreenElement = () =>
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    const settleTimer = setTimeout(() => {
      settlingRef.current = false;
      if (!fullscreenElement()) setShowFsModal(true);
    }, 2500);

    goFullscreen();

    const onFsChange = () => {
      const fullscreen = Boolean(fullscreenElement());

      if (fullscreen) {
        setShowFsModal(false);
      } else if (!settlingRef.current) {
        setShowFsModal(true);
        record('fullscreen_exit', 'You exited full-screen mode', {
          hard: true,
        });
      }
    };

    const onBlurOrHide = (reason) => {
      if (settlingRef.current || terminatedRef.current) return;

      // A single tab switch commonly fires both blur and visibilitychange.
      if (Date.now() - lastTabViolationRef.current < 1000) return;
      lastTabViolationRef.current = Date.now();

      record('tab_switch', reason || 'You switched away from the exam tab', {
        hard: true,
      });
    };

    const onWindowBlur = () => onBlurOrHide('Window lost focus');
    const onVisibility = () => {
      if (document.hidden) onBlurOrHide('You left the exam tab');
    };

    const blockClipboard = (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        event.clipboardData?.clearData();
        event.clipboardData?.setData('text/plain', '');
        window.getSelection()?.removeAllRanges();
        navigator.clipboard?.writeText?.('').catch(() => {});
      } catch (_) {}

      const type = event.type;
      record(
        type,
        `${type.charAt(0).toUpperCase() + type.slice(1)} is disabled during the exam`
      );
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      record('context_menu', 'Right-click is disabled during the exam', {
        silent: true,
      });
    };

    const onKeyDown = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();
      if (!['c', 'x', 'u', 'p', 's'].includes(key)) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        window.getSelection()?.removeAllRanges();
        navigator.clipboard?.writeText?.('').catch(() => {});
      } catch (_) {}

      if (key === 'c') {
        record('copy', 'Copying content is blocked during the exam');
      } else if (key === 'x') {
        record('cut', 'Cutting content is blocked during the exam');
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);

    let cancelled = false;
    let faceapi = null;
    let detectionRunning = false;

    async function runDetection() {
      const video = videoRef.current;
      if (
        cancelled ||
        detectionRunning ||
        !faceapi ||
        !video ||
        video.readyState < 2
      ) {
        return;
      }

      detectionRunning = true;

      try {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.5,
        });
        const faces = await faceapi.detectAllFaces(video, options);

        if (cancelled) return;

        if (faces.length === 0) {
          if (faceStateRef.current !== 'no_face') {
            faceStateRef.current = 'no_face';
            setCamStatus('no_face');
            record('no_face', 'No face detected — stay in front of the camera');
          }
        } else if (faces.length > 1) {
          if (faceStateRef.current !== 'multi_face') {
            faceStateRef.current = 'multi_face';
            setCamStatus('multi_face');
            record(
              'multiple_faces',
              `${faces.length} faces detected — only you should be visible`
            );
          }
        } else {
          faceStateRef.current = 'ok';
          setCamStatus('ready');
        }
      } catch (_) {
        // Ignore transient frame-processing errors.
      } finally {
        detectionRunning = false;
      }
    }

    async function startCamera() {
      if (!requireCamera) {
        setCamStatus('ready');
        return;
      }

      try {
        faceapi = await loadFaceApi();
        if (cancelled) return;
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      } catch (_) {
        faceapi = null;
        if (!cancelled) {
          setCamStatus('error');
          record('camera_blocked', 'Face-detection model failed to load', {
            silent: true,
          });
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!cancelled) {
          setCamStatus((status) => (status === 'error' ? 'error' : 'ready'));
        }
      } catch (_) {
        if (!cancelled) {
          setCamStatus('denied');
          record('camera_blocked', 'Camera access was blocked');
        }
        return;
      }

      if (!cancelled && faceapi?.nets?.tinyFaceDetector?.isLoaded) {
        detectTimerRef.current = setInterval(runDetection, 3000);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      clearInterval(detectTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      dragCleanupRef.current?.();

      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;

      if (exit && fullscreenElement()) {
        try {
          Promise.resolve(exit.call(document)).catch(() => {});
        } catch (_) {}
      }
    };
  }, [active, goFullscreen, record, requireCamera]);

  if (!active) return null;

  const camMeta = {
    loading: {
      color: '#64748b',
      ring: '#64748b',
      label: 'Starting camera…',
      Icon: Camera,
    },
    ready: {
      color: '#16a34a',
      ring: '#16a34a',
      label: 'Face OK',
      Icon: ShieldCheck,
    },
    no_face: {
      color: '#d97706',
      ring: '#d97706',
      label: 'No face detected',
      Icon: ShieldAlert,
    },
    multi_face: {
      color: '#dc2626',
      ring: '#dc2626',
      label: 'Multiple faces',
      Icon: ShieldAlert,
    },
    denied: {
      color: '#dc2626',
      ring: '#dc2626',
      label: 'Camera blocked',
      Icon: CameraOff,
    },
    error: {
      color: '#dc2626',
      ring: '#dc2626',
      label: 'Face model error',
      Icon: CameraOff,
    },
  }[camStatus] || {
    color: '#64748b',
    ring: '#64748b',
    label: 'Camera',
    Icon: Camera,
  };

  const CamIcon = camMeta.Icon;

  return (
    <>
      {banner && (
        <div
          style={{
            background: 'rgba(220,38,38,0.10)',
            border: '1px solid rgba(220,38,38,0.4)',
            padding: '9px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#dc2626',
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={16} />
          {banner} · Strike {Math.min(hardStrikes, maxHardStrikes)}/{maxHardStrikes}
        </div>
      )}

      {requireCamera && (
        <div
          style={{
            position: 'fixed',
            left: camPos.x,
            top: camPos.y,
            zIndex: 1200,
            width: isMinimized ? 'auto' : 172,
            borderRadius: 14,
            overflow: 'hidden',
            background: '#0f172a',
            border: `2px solid ${camMeta.ring}`,
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          }}
        >
          <div
            onMouseDown={handleDragStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 9px',
              background: '#090d16',
              borderBottom: isMinimized
                ? 'none'
                : '1px solid rgba(255,255,255,0.08)',
              cursor: 'grab',
              userSelect: 'none',
            }}
            title="Drag to reposition camera"
          >
            <GripHorizontal size={12} color="#64748b" />
            <CamIcon size={12} color={camMeta.color} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: camMeta.color,
                whiteSpace: 'nowrap',
              }}
            >
              {camMeta.label}
            </span>
            <span
              style={{
                marginLeft: 4,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: camMeta.ring,
                boxShadow: `0 0 6px ${camMeta.ring}`,
              }}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMinimized((minimized) => !minimized);
              }}
              title={isMinimized ? 'Expand camera view' : 'Minimize camera view'}
              style={{
                marginLeft: 10,
                background: 'transparent',
                border: 'none',
                padding: '2px 4px',
                borderRadius: 4,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
          </div>

          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: isMinimized ? 1 : '100%',
              height: isMinimized ? 0 : 118,
              objectFit: 'cover',
              display: isMinimized ? 'none' : 'block',
              transform: 'scaleX(-1)',
              background: '#0f172a',
            }}
          />
        </div>
      )}

      {showFsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 420,
              maxWidth: '90vw',
              background: '#ffffff',
              borderRadius: 18,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(15,23,42,0.4)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(220,38,38,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <ShieldAlert size={28} color="#dc2626" />
            </div>
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 20,
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Full-screen required
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569' }}>
              Return to full-screen to continue your exam.
            </p>
            <p
              style={{
                margin: '0 0 20px',
                fontSize: 12,
                color: '#dc2626',
                fontWeight: 700,
              }}
            >
              Strike {Math.min(hardStrikes, maxHardStrikes)} of {maxHardStrikes}
            </p>
            <button
              type="button"
              onClick={goFullscreen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Maximize size={16} />
              Return to full-screen
            </button>
          </div>
        </div>
      )}
    </>
  );
}