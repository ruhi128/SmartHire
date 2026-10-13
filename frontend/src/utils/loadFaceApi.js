// face-api.js publishes a browser UMD bundle, but its package entry point also
// contains Node `fs` fallback code that Create React App/Webpack 5 will not
// polyfill. Load the checked-in browser bundle from /public at runtime instead
// of bundling the Node-oriented package entry. This keeps proctoring and mock
// interview face detection browser-only and lets production builds succeed.

const FACE_API_SCRIPT_ID = 'smarthire-face-api-browser-bundle';
let faceApiPromise = null;

function browserBundleUrl() {
  return `${process.env.PUBLIC_URL || ''}/vendor/face-api.min.js`;
}

export function loadFaceApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Face detection is available only in a browser.'));
  }
  if (window.faceapi) return Promise.resolve(window.faceapi);
  if (faceApiPromise) return faceApiPromise;

  faceApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = FACE_API_SCRIPT_ID;
    script.async = true;
    script.src = browserBundleUrl();
    script.onload = () => {
      if (window.faceapi) resolve(window.faceapi);
      else reject(new Error('Face-detection browser bundle did not expose its API.'));
    };
    script.onerror = () => reject(new Error('Face-detection browser bundle could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error) => {
    // Permit a later retry if a transient offline/cache load failed.
    faceApiPromise = null;
    const staleScript = document.getElementById(FACE_API_SCRIPT_ID);
    staleScript?.remove?.();
    throw error;
  });

  return faceApiPromise;
}
