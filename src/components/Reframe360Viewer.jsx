import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Equidistant dual-fisheye -> sphere shader. ih_fov/iv_fov = 180deg per lens
// (matches DEFAULT_DFISHEYE_FOV in services/reframe360/reframe.js). Front
// lens covers the +Z hemisphere, back lens the -Z hemisphere in the
// direction vector computed from each sphere fragment's own position.
//
// uFrontRotation/uBackRotation (radians) and uFrontFlip/uBackFlip (0 or 1,
// per-axis) exist ONLY for empirical calibration in Task 2 Step 4 below --
// this project's own combine function (fetchLocalDualFisheyePreview in
// Reframe360.jsx, rotateCanvas90('ccw') for front / rotateCanvas90('cw')
// for back) is the proven-correct reference to calibrate against, not a
// value to derive from ffmpeg filter semantics by hand -- rotation/mirror
// conventions between canvas 2D and a raw camera sensor are easy to get
// subtly backwards, and this codebase already has a verified-working
// reference to match instead of re-deriving it blind.
const FRAGMENT_SHADER = `
  uniform sampler2D uFrontTex;
  uniform sampler2D uBackTex;
  uniform float uFrontRotation;
  uniform float uBackRotation;
  varying vec3 vDirection;

  vec2 fisheyeUV(vec3 dir, float rotation) {
    // dir is normalized, dir.z > 0 assumed (caller picks the right hemisphere)
    float theta = acos(clamp(dir.z, -1.0, 1.0)); // 0 at center, PI/2 at edge for 180deg FOV
    float r = theta / (3.14159265 * 0.5); // normalized 0..1
    float phi = atan(dir.y, dir.x) + rotation;
    vec2 uv = vec2(cos(phi), sin(phi)) * r * 0.5 + 0.5;
    return uv;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    if (dir.z >= 0.0) {
      vec2 uv = fisheyeUV(vec3(dir.x, dir.y, dir.z), uFrontRotation);
      gl_FragColor = texture2D(uFrontTex, uv);
    } else {
      vec2 uv = fisheyeUV(vec3(dir.x, dir.y, -dir.z), uBackRotation);
      gl_FragColor = texture2D(uBackTex, uv);
    }
  }
`;

const VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    // Sphere geometry's own vertex position, before any model transform,
    // IS the view direction for a unit-radius sphere centered at the
    // camera -- no need to compute yaw/pitch separately per-fragment.
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const Reframe360Viewer = forwardRef(function Reframe360Viewer({ frontFile, backFile, width = 480, height = 480 }, ref) {
  const canvasRef = useRef(null);
  const frontVideoRef = useRef(null);
  const backVideoRef = useRef(null);
  const threeRef = useRef(null); // { THREE, renderer, scene, camera, frontTex, backTex }
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = null;

    async function init() {
      let THREE;
      try {
        THREE = await import('three');
      } catch (err) {
        if (!cancelled) setInitError('WebGL viewer failed to load: ' + err.message);
        return;
      }
      if (cancelled) return;

      const frontVideo = document.createElement('video');
      const backVideo = document.createElement('video');
      for (const v of [frontVideo, backVideo]) {
        v.muted = true;
        v.playsInline = true;
        v.loop = true;
      }
      frontVideo.src = URL.createObjectURL(frontFile);
      backVideo.src = URL.createObjectURL(backFile);
      frontVideoRef.current = frontVideo;
      backVideoRef.current = backVideo;

      try {
        await Promise.all([
          new Promise((resolve, reject) => {
            frontVideo.onloadeddata = resolve;
            frontVideo.onerror = () => reject(new Error(
              `Failed to decode ${frontFile.name}: ` + (frontVideo.error?.message || 'unknown error')
            ));
          }),
          new Promise((resolve, reject) => {
            backVideo.onloadeddata = resolve;
            backVideo.onerror = () => reject(new Error(
              `Failed to decode ${backFile.name}: ` + (backVideo.error?.message || 'unknown error')
            ));
          }),
        ]);
      } catch (err) {
        if (!cancelled) setInitError(err.message);
        return;
      }
      if (cancelled) return;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      } catch (err) {
        setInitError('WebGL is not available in this browser: ' + err.message);
        return;
      }
      renderer.setSize(width, height);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 10);
      camera.position.set(0, 0, 0);

      const frontTex = new THREE.VideoTexture(frontVideo);
      const backTex = new THREE.VideoTexture(backVideo);

      const geometry = new THREE.SphereGeometry(5, 64, 40);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uFrontTex: { value: frontTex },
          uBackTex: { value: backTex },
          uFrontRotation: { value: Math.PI / 2 },
          uBackRotation: { value: Math.PI / 2 + Math.PI },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        side: THREE.BackSide, // texture faces inward -- camera sits inside the sphere
      });
      const sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);

      threeRef.current = { THREE, renderer, scene, camera, sphere };

      function tick() {
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
      }
      tick();

      await Promise.all([frontVideo.play(), backVideo.play()]);
      if (!cancelled) setIsReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      const t = threeRef.current;
      if (t) {
        t.renderer.dispose();
      }
      for (const v of [frontVideoRef.current, backVideoRef.current]) {
        if (v) {
          v.pause();
          URL.revokeObjectURL(v.src);
        }
      }
    };
  }, [frontFile, backFile, width, height]);

  useImperativeHandle(ref, () => ({
    isReady,
    getCameraState() {
      const t = threeRef.current;
      if (!t) return { yaw: 0, pitch: 0, fov: 90 };
      // three.js Euler order 'YXZ': y = yaw (heading), x = pitch. Camera looks
      // down -Z by default, matching dir.z>=0 = front hemisphere above.
      const euler = new t.THREE.Euler().setFromQuaternion(t.camera.quaternion, 'YXZ');
      return {
        yaw: (euler.y * 180) / Math.PI,
        pitch: (euler.x * 180) / Math.PI,
        fov: t.camera.fov,
      };
    },
    setCameraState({ yaw, pitch, fov }) {
      const t = threeRef.current;
      if (!t) return;
      t.camera.rotation.order = 'YXZ';
      if (yaw !== undefined) t.camera.rotation.y = (yaw * Math.PI) / 180;
      if (pitch !== undefined) t.camera.rotation.x = (pitch * Math.PI) / 180;
      if (fov !== undefined) { t.camera.fov = fov; t.camera.updateProjectionMatrix(); }
    },
    getCurrentTime() {
      return frontVideoRef.current ? frontVideoRef.current.currentTime : 0;
    },
    play() {
      frontVideoRef.current?.play();
      backVideoRef.current?.play();
    },
    pause() {
      frontVideoRef.current?.pause();
      backVideoRef.current?.pause();
    },
    seek(seconds) {
      if (frontVideoRef.current) frontVideoRef.current.currentTime = seconds;
      if (backVideoRef.current) backVideoRef.current.currentTime = seconds;
    },
  }), [isReady]);

  const dragState = useRef({ dragging: false, lastX: 0, lastY: 0 });

  function handlePointerDown(e) {
    dragState.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    canvasRef.current.style.cursor = 'grabbing';
  }
  function handlePointerMove(e) {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.lastX;
    const dy = e.clientY - dragState.current.lastY;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;
    const t = threeRef.current;
    if (!t) return;
    const sensitivity = 0.005;
    t.camera.rotation.order = 'YXZ';
    t.camera.rotation.y -= dx * sensitivity;
    t.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, t.camera.rotation.x - dy * sensitivity));
  }
  function handlePointerUp() {
    dragState.current.dragging = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }
  // React registers root-level wheel listeners as passive by default, so
  // e.preventDefault() inside a JSX onWheel handler is a silent no-op (and
  // throws a console error) -- attach a native, non-passive listener instead
  // so the page doesn't scroll while the user scroll-zooms the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheelNative = (e) => {
      e.preventDefault();
      const t = threeRef.current;
      if (!t) return;
      t.camera.fov = Math.max(40, Math.min(140, t.camera.fov + e.deltaY * 0.05));
      t.camera.updateProjectionMatrix();
    };
    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheelNative);
  }, []);
  function handleKeyDown(e) {
    const t = threeRef.current;
    if (!t) return;
    const step = (2 * Math.PI) / 180; // ~2 degrees per key press
    t.camera.rotation.order = 'YXZ';
    if (e.key === 'ArrowLeft') t.camera.rotation.y += step;
    else if (e.key === 'ArrowRight') t.camera.rotation.y -= step;
    else if (e.key === 'ArrowUp') t.camera.rotation.x = Math.max(-Math.PI / 2, t.camera.rotation.x + step);
    else if (e.key === 'ArrowDown') t.camera.rotation.x = Math.min(Math.PI / 2, t.camera.rotation.x - step);
  }

  if (initError) return null; // Reframe360.jsx (Task 6) checks this via a separate error callback prop

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={handleKeyDown}
      style={{ display: 'block', borderRadius: 10, cursor: 'grab', outline: 'none' }}
    />
  );
});

export default Reframe360Viewer;
