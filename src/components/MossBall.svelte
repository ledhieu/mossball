<script>
  import { useTask, useThrelte } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import GUI from 'lil-gui';
  import vertexShader from '../shaders/mossball.vert?raw';
  import fragmentShader from '../shaders/mossball.frag?raw';

  const { scene, camera, renderer } = useThrelte();

  let BLADE_COUNT = 125000;
  const MAX_BLADE_COUNT = 500000;
  const SPHERE_RADIUS = 3;

  function createBladeGeometry() {
    const segs = 6, W = 0.1, H = 0.4;
    const verts = [], norms = [], uvArr = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, y = t * H, hw = W * 0.5 * (1.0 - t * 0.82);
      verts.push(-hw, y, 0, hw, y, 0);
      norms.push(0, 0, 1, 0, 0, 1);
      uvArr.push(0, t, 1, t);
    }
    for (let i = 0; i < segs; i++) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    geo.setIndex(idx);
    return geo;
  }

  const bladeGeo = createBladeGeometry();

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    alphaTest: 0.05,
    uniforms: {
      uTime: { value: 0 },
      uWindSpeed: { value: 1.2 },
      uWindAmplitude: { value: 0.25 },
      uLengthMultiplier: { value: 1.2 },
      uClumpStrength: { value: 0.4 },
      uMotionClumpBoost: { value: 0.0 },
      uBaseColor: { value: new THREE.Color('#020a01') },
      uTipColor: { value: new THREE.Color('#7ec820') },
      uFogColor: { value: new THREE.Color('#050810') },
      uFogStart: { value: 15.0 },
      uFogEnd: { value: 40.0 },
    }
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, material, MAX_BLADE_COUNT);
  mesh.count = BLADE_COUNT;
  mesh.frustumCulled = false;

  const basePosArr = new Float32Array(MAX_BLADE_COUNT * 3);
  const normalArr = new Float32Array(MAX_BLADE_COUNT * 3);
  const tangentArr = new Float32Array(MAX_BLADE_COUNT * 3);
  const bitangentArr = new Float32Array(MAX_BLADE_COUNT * 3);
  const bendStateArr = new Float32Array(MAX_BLADE_COUNT * 2);
  const bendVelArr = new Float32Array(MAX_BLADE_COUNT * 2);
  const heightScaleArr = new Float32Array(MAX_BLADE_COUNT);
  const restOffsetXArr = new Float32Array(MAX_BLADE_COUNT);
  const restOffsetZArr = new Float32Array(MAX_BLADE_COUNT);
  const responseVarArr = new Float32Array(MAX_BLADE_COUNT);
  const lengthScaleArr = new Float32Array(MAX_BLADE_COUNT);
  const spinPatternArr = new Float32Array(MAX_BLADE_COUNT);

  const noise2D = (x, z) => (Math.sin(x) * Math.cos(z)) * 0.5 + 0.5;
  const noise3D = (x, y, z) => (
    Math.sin(x * 1.7 + y * 0.3) * Math.cos(y * 1.3 + z * 0.7) * 0.5 +
    Math.sin(z * 0.9 + x * 1.1) * 0.3
  ) + 0.5;

  for (let i = 0; i < MAX_BLADE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    let x = SPHERE_RADIUS * sinPhi * Math.cos(theta);
    let y = SPHERE_RADIUS * sinPhi * Math.sin(theta);
    let z = SPHERE_RADIUS * cosPhi;

    // ===== Flow-field clumping: curvy locks across the sphere =====
    // Primary flow direction — lower freq creates larger, more visible sweeping curves
    const flowAngle = noise3D(x * 0.22 + 100, y * 0.22 + 200, z * 0.22 + 300) * Math.PI * 2;

    // Lock strength — lower threshold so more blades join clumps, stronger multiplier
    const lockStrengthNoise = noise3D(x * 0.55 + 400, y * 0.45 + 500, z * 0.65 + 600);
    const lockStrength = Math.max(0, (lockStrengthNoise - 0.22) * 2.2);

    // Secondary detail flow — higher freq creates smaller nested curves inside locks
    const detailAngle = noise3D(x * 0.9 + 700, y * 0.9 + 800, z * 0.9 + 900) * Math.PI * 2;
    const detailStrength = Math.max(0, (noise3D(x * 0.9 + 1000, y * 0.9 + 1100, z * 0.9 + 1200) - 0.4) * 1.3);

    // Combine primary + detail for rich, layered curves
    const finalFlowAngle = flowAngle + detailAngle * detailStrength * 0.4;

    // Blend random rotation with flow direction based on lock strength
    const randomRot = Math.random() * Math.PI * 2;
    const blend = lockStrength * 0.78;
    let rotAngle = randomRot * (1 - blend) + finalFlowAngle * blend;
    // Less variation in clumps for tighter, more visible locks
    rotAngle += (Math.random() - 0.5) * 0.30 * (1 - lockStrength);

    // Position jitter — stronger inside locks for more visible raised organic feel
    const jitter = 0.08 * lockStrength;
    if (jitter > 0.002) {
      x += (Math.random() - 0.5) * jitter;
      y += (Math.random() - 0.5) * jitter;
      z += (Math.random() - 0.5) * jitter;
      const len = Math.sqrt(x * x + y * y + z * z);
      x = (x / len) * SPHERE_RADIUS;
      y = (y / len) * SPHERE_RADIUS;
      z = (z / len) * SPHERE_RADIUS;
    }

    const idx3 = i * 3;
    basePosArr[idx3] = x;
    basePosArr[idx3 + 1] = y;
    basePosArr[idx3 + 2] = z;

    const normal = new THREE.Vector3(x, y, z).normalize();
    normalArr[idx3] = normal.x;
    normalArr[idx3 + 1] = normal.y;
    normalArr[idx3 + 2] = normal.z;

    const arbitrary = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangentBase = new THREE.Vector3().crossVectors(arbitrary, normal).normalize();
    const bitangentBase = new THREE.Vector3().crossVectors(normal, tangentBase);
    const cosR = Math.cos(rotAngle);
    const sinR = Math.sin(rotAngle);
    const tangent = new THREE.Vector3()
      .addScaledVector(tangentBase, cosR)
      .addScaledVector(bitangentBase, sinR)
      .normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    tangentArr[idx3] = tangent.x;
    tangentArr[idx3 + 1] = tangent.y;
    tangentArr[idx3 + 2] = tangent.z;

    bitangentArr[idx3] = bitangent.x;
    bitangentArr[idx3 + 1] = bitangent.y;
    bitangentArr[idx3 + 2] = bitangent.z;

    const equatorFactor = sinPhi;
    const heightVar = 1.2 + Math.random() * 1.3;
    heightScaleArr[i] = heightVar * (0.4 + 0.6 * equatorFactor);

    // Random rest lean so blades never perfectly align — breaks X-convergence
    restOffsetXArr[i] = (Math.random() - 0.5) * 0.5;
    restOffsetZArr[i] = (Math.random() - 0.5) * 0.5;

    // Per-blade response variation: 0.5x to 1.5x
    responseVarArr[i] = 0.5 + Math.random() * 0.5;

    // Spin pattern — low-freq noise creates spatially coherent regions
    // that lag/lead differently during rotation for non-uniform spin look
    const spinPat = noise3D(x * 0.22 + 800, y * 0.22 + 900, z * 0.22 + 1000);
    spinPatternArr[i] = 2.35 + spinPat * 3.3; // 0.35 to 1.65

    // Long stray strands: ~0.1% of blades get 2-4x length
    const isLongStrand = Math.random() < 0.0008;
    lengthScaleArr[i] = isLongStrand ? 1 + Math.random() * 1.2 : 0.5 + Math.random() * 0.5;
  }

  bladeGeo.setAttribute('aBasePos', new THREE.InstancedBufferAttribute(basePosArr, 3));
  bladeGeo.setAttribute('aNormal', new THREE.InstancedBufferAttribute(normalArr, 3));
  bladeGeo.setAttribute('aTangent', new THREE.InstancedBufferAttribute(tangentArr, 3));
  bladeGeo.setAttribute('aBitangent', new THREE.InstancedBufferAttribute(bitangentArr, 3));
  bladeGeo.setAttribute('aBendState', new THREE.InstancedBufferAttribute(bendStateArr, 2));
  bladeGeo.setAttribute('aHeightScale', new THREE.InstancedBufferAttribute(heightScaleArr, 1));
  bladeGeo.setAttribute('aLengthScale', new THREE.InstancedBufferAttribute(lengthScaleArr, 1));

  const dummy = new THREE.Object3D();
  for (let i = 0; i < MAX_BLADE_COUNT; i++) mesh.setMatrixAt(i, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;

  const darkSphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS - 0.05, 64, 64);
  const darkSphereMat = new THREE.MeshStandardMaterial({
    color: '#0a1a06',
    roughness: 0.9,
    metalness: 0.2,
  });
  const darkSphere = new THREE.Mesh(darkSphereGeo, darkSphereMat);

  // Invisible hit sphere for interaction (slightly larger than moss extent)
  const hitSphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS + 0.3, 32, 32);
  const hitSphereMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitSphere = new THREE.Mesh(hitSphereGeo, hitSphereMat);

  // Group ball objects so nudge offset can be applied to the whole ball
  const ballGroup = new THREE.Group();
  ballGroup.add(mesh);
  ballGroup.add(darkSphere);
  ballGroup.add(hitSphere);
  scene.add(ballGroup);

  // ===== Lighting =====
  // Top spotlight (warm, pointed down at ball, slightly toward back)
  const topSpot = new THREE.SpotLight('#fff5e0', 110, 35, Math.PI * 0.12, 0.5, 1);
  topSpot.position.set(0, 14, -5);
  topSpot.target.position.set(0, 0, 0);
  scene.add(topSpot);
  scene.add(topSpot.target);

  // Backlight (warm amber rim light from behind)
  const backLight = new THREE.DirectionalLight('#d0c0a0', 2.0);
  backLight.position.set(0, 2, -12);
  scene.add(backLight);

  // ===== Aquarium Post-Processing =====
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });

  const postMaterial = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSSAAScale;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        // Barrel distortion (corners bulge outward)
        vec2 centered = (uv - 0.5) * 2.0;
        float r = length(centered);
        float distortionFactor = 1.0 + 0.10 * r * r;
        vec2 distortedUv = centered / distortionFactor * 0.5 + 0.5;

        // Sharp main image
        vec4 main = texture2D(uTexture, distortedUv);

        // === Dreamy chromatic aberration ===
        float edge = smoothstep(0.40, 1.3, r);

        // Horizontal smudge direction (radial but x-dominant)
        vec2 smudgeDir = normalize(vec2(centered.x * 3.0, centered.y * 0.25));
        float smudge = 0.016 * edge;

        // Multi-tap soft samples for dreamy smeared look
        vec3 o1 = texture2D(uTexture, distortedUv + smudgeDir * smudge * 0.6).rgb;
        vec3 o2 = texture2D(uTexture, distortedUv + smudgeDir * smudge * 1.3).rgb;
        vec3 o3 = texture2D(uTexture, distortedUv + smudgeDir * smudge * 2.2).rgb;
        vec3 i1 = texture2D(uTexture, distortedUv - smudgeDir * smudge * 0.6).rgb;
        vec3 i2 = texture2D(uTexture, distortedUv - smudgeDir * smudge * 1.3).rgb;
        vec3 i3 = texture2D(uTexture, distortedUv - smudgeDir * smudge * 2.2).rgb;

        // Outward = blue-purple, Inward = warm yellow-green — softer, dreamier weights
        vec3 outward = (o1 * vec3(0.24, 0.10, 0.78) + o2 * vec3(0.18, 0.08, 0.62) + o3 * vec3(0.10, 0.04, 0.42)) * 0.4;
        vec3 inward  = (i1 * vec3(0.56, 0.48, 0.12) + i2 * vec3(0.44, 0.38, 0.09) + i3 * vec3(0.28, 0.24, 0.06)) * 0.4;

        // Asymmetric blend
        float hSide = smoothstep(-0.35, 0.35, centered.x);
        vec3 sep = mix(outward * 1.1 + inward * 0.35, outward * 0.50 + inward * 0.80, hSide);

        vec3 fringe = (sep - main.rgb * 0.45) * (1.0 + edge * 1.2);
        vec3 color = mix(main.rgb, main.rgb + fringe, 0.50);

        // Dreamy global blur — wider radius, applies everywhere for softness
        float blurStrength = 0.18 + smoothstep(0.05, 1.3, r) * 0.55;
        vec2 blurOff = vec2(0.012, 0.012) * max(r, 0.35);
        vec3 blurred = (
            texture2D(uTexture, distortedUv + blurOff).rgb +
            texture2D(uTexture, distortedUv - blurOff).rgb +
            texture2D(uTexture, distortedUv + vec2(blurOff.x, -blurOff.y)).rgb +
            texture2D(uTexture, distortedUv + vec2(-blurOff.x, blurOff.y)).rgb +
            texture2D(uTexture, distortedUv + vec2(blurOff.x * 0.5, blurOff.y * 0.5)).rgb +
            texture2D(uTexture, distortedUv - vec2(blurOff.x * 0.5, blurOff.y * 0.5)).rgb +
            texture2D(uTexture, distortedUv + vec2(blurOff.x * 0.5, -blurOff.y * 0.5)).rgb +
            texture2D(uTexture, distortedUv + vec2(-blurOff.x * 0.5, blurOff.y * 0.5)).rgb
        ) * 0.125;
        color = mix(color, blurred, blurStrength);

        // === Depth-based underwater halation (disabled) ===
        // Large soft blur for foggy light scatter (8-tap)
        // vec3 s1 = texture2D(uTexture, distortedUv + vec2( 0.012,  0.000)).rgb;
        // vec3 s2 = texture2D(uTexture, distortedUv + vec2(-0.012,  0.000)).rgb;
        // vec3 s3 = texture2D(uTexture, distortedUv + vec2( 0.000,  0.012)).rgb;
        // vec3 s4 = texture2D(uTexture, distortedUv + vec2( 0.000, -0.012)).rgb;
        // vec3 s5 = texture2D(uTexture, distortedUv + vec2( 0.008,  0.008)).rgb;
        // vec3 s6 = texture2D(uTexture, distortedUv + vec2(-0.008,  0.008)).rgb;
        // vec3 s7 = texture2D(uTexture, distortedUv + vec2( 0.008, -0.008)).rgb;
        // vec3 s8 = texture2D(uTexture, distortedUv + vec2(-0.008, -0.008)).rgb;
        // vec3 softBlur = (s1+s2+s3+s4+s5+s6+s7+s8) * 0.125;

        // Brightness mask — only bright areas (the ball) emit halation
        // float blurBright = dot(softBlur, vec3(0.299, 0.587, 0.114));
        // float halationMask = smoothstep(0.06, 0.28, blurBright);

        // Depth-based halation: strong at center and top-back (backlight scatter)
        // float depthFade = 1.0 - smoothstep(0.0, 0.9, r);
        // float backLightBias = smoothstep(-0.2, 0.6, centered.y);
        // float halationStrength = depthFade * 0.5 + backLightBias * depthFade * 0.35;

        // vec3 halation = softBlur * halationMask * halationStrength;
        // Warm-green scatter tint (matches underwater plant light)
        // halation *= vec3(0.92, 1.0, 0.78);
        // color += halation;

        // Depth fog — murkier toward edges, preserving center/back brightness
        float fogDepth = smoothstep(0.25, 1.2, r);
        vec3 deepFog = vec3(0.04, 0.09, 0.12);
        color = mix(color, deepFog, fogDepth * 0.22);

        // Underwater softness — gentle desaturation for dreamy haze
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(lum), color, 0.92);

        // Aquarium tint disabled
         color = mix(color, vec3(.58, 0.90, 0.75), 0.0);

        vec2 aaTexel = vec2(1.0) / (uResolution * uSSAAScale);

        // === SMAA-like morphological edge detection ===
        // 8-tap neighborhood (cross + diagonals), local contrast adaptation,
        // edge direction from gradients, directional blending, subpixel handling.
        vec3 cM = color;
        vec3 cN = texture2D(uTexture, distortedUv + vec2(0.0, aaTexel.y)).rgb;
        vec3 cS = texture2D(uTexture, distortedUv + vec2(0.0, -aaTexel.y)).rgb;
        vec3 cE = texture2D(uTexture, distortedUv + vec2(aaTexel.x, 0.0)).rgb;
        vec3 cW = texture2D(uTexture, distortedUv + vec2(-aaTexel.x, 0.0)).rgb;
        vec3 cNE = texture2D(uTexture, distortedUv + vec2(aaTexel.x, aaTexel.y)).rgb;
        vec3 cNW = texture2D(uTexture, distortedUv + vec2(-aaTexel.x, aaTexel.y)).rgb;
        vec3 cSE = texture2D(uTexture, distortedUv + vec2(aaTexel.x, -aaTexel.y)).rgb;
        vec3 cSW = texture2D(uTexture, distortedUv + vec2(-aaTexel.x, -aaTexel.y)).rgb;

        float lM = dot(cM, vec3(0.299, 0.587, 0.114));
        float lN = dot(cN, vec3(0.299, 0.587, 0.114));
        float lS = dot(cS, vec3(0.299, 0.587, 0.114));
        float lE = dot(cE, vec3(0.299, 0.587, 0.114));
        float lW = dot(cW, vec3(0.299, 0.587, 0.114));
        float lNE = dot(cNE, vec3(0.299, 0.587, 0.114));
        float lNW = dot(cNW, vec3(0.299, 0.587, 0.114));
        float lSE = dot(cSE, vec3(0.299, 0.587, 0.114));
        float lSW = dot(cSW, vec3(0.299, 0.587, 0.114));

        float maxL = max(max(max(lN, lS), max(lE, lW)), max(max(lNE, lNW), max(lSE, lSW)));
        float minL = min(min(min(lN, lS), min(lE, lW)), min(min(lNE, lNW), min(lSE, lSW)));
        float localContrast = maxL - minL;
        float edgeThreshold = 0.001;

        if (localContrast > edgeThreshold) {
          float gradX = abs(lE - lW) + abs(lNE - lNW) + abs(lSE - lSW);
          float gradY = abs(lN - lS) + abs(lNE - lSE) + abs(lNW - lSW);
          vec2 gradDir = normalize(vec2(gradX, gradY) + 0.0001);
          vec2 edgeDir = vec2(-gradDir.y, gradDir.x);

          vec2 off1 = edgeDir * aaTexel * 1.0;
          vec2 off2 = edgeDir * aaTexel * 2.5;
          vec3 sample1 = (texture2D(uTexture, distortedUv + off1).rgb +
                          texture2D(uTexture, distortedUv - off1).rgb) * 0.5;
          vec3 sample2 = (texture2D(uTexture, distortedUv + off2).rgb +
                          texture2D(uTexture, distortedUv - off2).rgb) * 0.5;
          vec3 blend = mix(sample1, sample2, 0.45);

          float avgL = (lN + lS + lE + lW) * 0.25;
          float subpix = abs(lM - avgL) / localContrast;
          float blendWeight = smoothstep(edgeThreshold, 0.05, localContrast) * (0.4 + subpix * 0.35);

          float radialBoost = 1.0 + smoothstep(0.15, 0.85, r) * 2.0;
          blendWeight *= radialBoost;

          color = mix(cM, blend, clamp(blendWeight, 0.0, 0.8));
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    uniforms: {
      uTexture: { value: renderTarget.texture },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSSAAScale: { value: 3.0 }
    }
  });

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

  let ssaaScale = 5;
  function updateRenderTargetSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderTarget.setSize(w * dpr * ssaaScale, h * dpr * ssaaScale);
    postMaterial.uniforms.uResolution.value.set(w * dpr, h * dpr);
    postMaterial.uniforms.uSSAAScale.value = ssaaScale;
  }

  const ballPos = new THREE.Vector3(0, 0, 0);
  const prevBallPos = new THREE.Vector3(0, 0, 0);
  const ballVel = new THREE.Vector3(0, 0, 0);
  const prevBallVel = new THREE.Vector3(0, 0, 0);
  const cursorTarget = new THREE.Vector3(0, 0, 0);
  const cursorPos = new THREE.Vector3(0, 0, 0);

  // Spin state — ball rolls like a wheel, spin continues after linear momentum ends
  let spinVel = 0;
  const spinAxis = new THREE.Vector3(0, 1, 0);

  // Nudge spring physics (smooth impulse, ~3s critical-damped recovery)
  const nudgePos = new THREE.Vector3(0, 0, 0);
  const nudgeVel = new THREE.Vector3(0, 0, 0);
  const prevRenderPos = new THREE.Vector3(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  let lastMouseMove = 0;
  let isMouseActive = false;

  onMount(() => {
    scene.background = null;

    // ===== lil-gui Control Panel =====
    const guiHost = document.getElementById('gui-container');

    const gui = new GUI({ title: 'Controls' });
    gui.domElement.style.position = 'relative';
    gui.domElement.style.top = 'auto';
    gui.domElement.style.right = 'auto';
    gui.domElement.style.setProperty('--font-family', "'Geist', system-ui, sans-serif");
    gui.domElement.style.setProperty('--focus-color', '#ffffff');
    gui.domElement.style.setProperty('--number-color', '#ffffff');
    gui.domElement.style.setProperty('--text-color', '#a0a0a0');
    gui.domElement.style.setProperty('--background-color', '#0e0e0e');
    gui.domElement.style.setProperty('--title-background-color', '#0e0e0e');
    gui.domElement.style.setProperty('--widget-color', 'rgba(255, 255, 255, 0.08)');
    gui.domElement.style.setProperty('--hover-color', 'rgba(255, 255, 255, 0.15)');

    if (guiHost) guiHost.appendChild(gui.domElement);

    const darkBase = new THREE.Color('#020a01');
    const algaeBase = new THREE.Color('#1a5a0e');
    const darkTip = new THREE.Color('#3a6a10');
    const algaeTip = new THREE.Color('#9cd060');

    material.uniforms.uClumpStrength.value = 0.4;
    material.uniforms.uBaseColor.value.lerpColors(darkBase, algaeBase, 0.8);
    material.uniforms.uTipColor.value.lerpColors(darkTip, algaeTip, 0.8);

    const params = {
      bladeCount: BLADE_COUNT,
      length: 1.2,
      clumping: 0.4,
      color: 0.8,
    };

    gui.add(params, 'bladeCount', 20000, MAX_BLADE_COUNT, 20000).name('blade count').onChange((v) => {
      BLADE_COUNT = Math.round(v);
      mesh.count = BLADE_COUNT;
    });

    gui.add(params, 'length', 0.5, 2.5, 0.05).onChange((v) => {
      material.uniforms.uLengthMultiplier.value = v;
    });

    gui.add(params, 'clumping', 0.0, 2.0, 0.05).onChange((v) => {
      material.uniforms.uClumpStrength.value = v;
    });

    gui.add(params, 'color', 0.0, 1.0, 0.01).onChange((v) => {
      material.uniforms.uBaseColor.value.lerpColors(darkBase, algaeBase, v);
      material.uniforms.uTipColor.value.lerpColors(darkTip, algaeTip, v);
    });

    const onMouseMove = (e) => {
      mouseNDC.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      const currentCam = $camera;
      if (!currentCam) return;
      raycaster.setFromCamera(mouseNDC, currentCam);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(planeZ0, hit)) {
        cursorTarget.copy(hit);
        lastMouseMove = performance.now();
        isMouseActive = true;
      }
      // Cursor pointer when hovering over the moss ball
      const ballHits = raycaster.intersectObject(hitSphere);
      document.body.style.cursor = ballHits.length > 0 ? 'pointer' : '';
    };

    const doNudge = (clientX, clientY) => {
      mouseNDC.set(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      const currentCam = $camera;
      if (!currentCam) return;
      raycaster.setFromCamera(mouseNDC, currentCam);
      const hits = raycaster.intersectObject(hitSphere);
      if (hits.length > 0) {
        const hitPoint = hits[0].point;
        const ballCenter = ballPos.clone().add(nudgePos);
        const hitOffset = new THREE.Vector3().subVectors(hitPoint, ballCenter);
        // Nudge: velocity impulse away from click point + toward camera
        const impulse = hitOffset.clone().normalize().negate().multiplyScalar(1.2);
        impulse.z += 0.6;
        impulse.multiplyScalar(20.5);
        nudgeVel.add(impulse);
        // Torque-based spin: clicking off-center spins the ball like a real nudge
        const pushDir = new THREE.Vector3(0, 0, -1); // force direction
        const torque = new THREE.Vector3().crossVectors(hitOffset, pushDir);
        const torqueMag = torque.length();
        if (torqueMag > 0.001) {
          spinAxis.copy(torque.normalize());
          const maxSpinVel = 2.8;
          spinVel += (torqueMag / SPHERE_RADIUS) * maxSpinVel;
        }
      }
    };

    const onClick = (e) => doNudge(e.clientX, e.clientY);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', updateRenderTargetSize);
    updateRenderTargetSize();

    return () => {
      gui.destroy();
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', updateRenderTargetSize);
      scene.remove(ballGroup);
      scene.remove(topSpot);
      scene.remove(topSpot.target);
      scene.remove(backLight);
      bladeGeo.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
      darkSphereGeo.dispose();
      darkSphereMat.dispose();
      hitSphereGeo.dispose();
      hitSphereMat.dispose();
      renderTarget.dispose();
      postMaterial.dispose();

    };
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;

    const now = performance.now();
    if (now - lastMouseMove > 1000) {
      isMouseActive = false;
    }

    const cursorLerp = 1.0 - Math.exp(-8.0 * delta);
    cursorPos.lerp(cursorTarget, cursorLerp);
    const ballLerp = 1.0 - Math.exp(-2 * delta);
    prevBallPos.copy(ballPos);
    ballPos.lerp(cursorPos, ballLerp);

    // Spring-damper nudge: stiffer + lighter damping for overshoot
    const k = 3.0;
    const c = 1.4;
    const springForce = nudgePos.clone().multiplyScalar(-k);
    const dampingForce = nudgeVel.clone().multiplyScalar(-c);
    nudgeVel.add(springForce.add(dampingForce).multiplyScalar(delta));
    nudgePos.add(nudgeVel.clone().multiplyScalar(delta));

    const currentRenderPos = ballPos.clone().add(nudgePos);
    ballGroup.position.copy(currentRenderPos);

    prevBallVel.copy(ballVel);
    ballVel.subVectors(currentRenderPos, prevRenderPos).divideScalar(Math.max(delta, 0.0001));

    // Acceleration for inertial force
    const ballAccel = new THREE.Vector3().subVectors(ballVel, prevBallVel).divideScalar(Math.max(delta, 0.0001));
    const speed = ballVel.length();

    // Spin physics: ball rolls like a wheel, spin continues after linear momentum ends
    const targetSpinAxis = new THREE.Vector3().crossVectors(ballVel, new THREE.Vector3(0, 0, 1));
    if (targetSpinAxis.lengthSq() > 0.0001) {
      targetSpinAxis.normalize();
      spinAxis.lerp(targetSpinAxis, 0.2);
      spinAxis.normalize();
    }
    const targetSpin = speed / SPHERE_RADIUS * 1.0;
    // Delta-corrected lerp + damping that match the original moderate spin feel
    spinVel += (targetSpin - spinVel) * (1.0 - Math.exp(-8.0 * delta));
    spinVel *= Math.exp(-4.0 * delta);

    // Motion boosts clumping: faster movement / spin = more chaotic locks
    const speedBoost = Math.min(1.5, speed * 0.15);
    const spinBoost = Math.min(1.5, Math.abs(spinVel) * 0.08);
    material.uniforms.uMotionClumpBoost.value = speedBoost * 0.5 + spinBoost * 1;

    // Rotate mesh for visual spin
    mesh.rotateOnWorldAxis(spinAxis, spinVel * delta);
    darkSphere.rotateOnWorldAxis(spinAxis, spinVel * delta);

    // Air drag (opposes velocity) + inertia (opposes acceleration)
    const dragCoeff = 2.05;
    const inertiaCoeff = 2;
    const worldBendX = -ballVel.x * dragCoeff - ballAccel.x * inertiaCoeff;
    const worldBendY = -ballVel.y * dragCoeff - ballAccel.y * inertiaCoeff;
    const worldBendZ = -ballVel.z * dragCoeff - ballAccel.z * inertiaCoeff;

    const sAx = spinAxis.x, sAy = spinAxis.y, sAz = spinAxis.z;

    // Much softer spring for visible, lingering oscillation
    const stiffness = 1;
    const damping = 1.6;
    const bendAttr = bladeGeo.attributes.aBendState;

    for (let i = 0; i < BLADE_COUNT; i++) {
      const idx2 = i * 2;
      const idx3 = i * 3;

      const tx = tangentArr[idx3];
      const ty = tangentArr[idx3 + 1];
      const tz = tangentArr[idx3 + 2];
      const btx = bitangentArr[idx3];
      const bty = bitangentArr[idx3 + 1];
      const btz = bitangentArr[idx3 + 2];
      const nx = normalArr[idx3];
      const ny = normalArr[idx3 + 1];
      const nz = normalArr[idx3 + 2];

      // Exposure: blades on the trailing hemisphere (facing velocity) bend more
      const normalDotVel = nx * ballVel.x + ny * ballVel.y + nz * ballVel.z;
      const speedEps = speed + 0.001;
      const exposure = 0.3 + 0.7 * Math.max(0, -normalDotVel / speedEps);

      // Base force projected onto tangent plane, scaled by exposure and per-blade variation
      const response = responseVarArr[i] * exposure;
      const forceX = (worldBendX * tx + worldBendY * ty + worldBendZ * tz) * response;
      const forceZ = (worldBendX * btx + worldBendY * bty + worldBendZ * btz) * response;

      // Tangential torque from spin: tangent = cross(spinAxis, normal)
      const spinTanX = sAy * nz - sAz * ny;
      const spinTanY = sAz * nx - sAx * nz;
      const spinTanZ = sAx * ny - sAy * nx;
      const spinResponse = responseVarArr[i];
      // Spatial spin pattern + length factor: longer strands whip more,
      // pattern creates regional variation so spin doesn't look uniform
      const lengthFactor = 0.5 + lengthScaleArr[i] * 0.35;
      const spinMag = spinVel * SPHERE_RADIUS * spinResponse * spinPatternArr[i] * lengthFactor;
      const spinDX = (spinTanX * tx + spinTanY * ty + spinTanZ * tz) * spinMag;
      const spinDZ = (spinTanX * btx + spinTanY * bty + spinTanZ * btz) * spinMag;

      // Target includes random rest offset + linear force + spin torque
      const targetX = restOffsetXArr[i] + forceX + spinDX;
      const targetZ = restOffsetZArr[i] + forceZ + spinDZ;

      const ax = (targetX - bendStateArr[idx2]) * stiffness - bendVelArr[idx2] * damping;
      const az = (targetZ - bendStateArr[idx2 + 1]) * stiffness - bendVelArr[idx2 + 1] * damping;

      bendVelArr[idx2] += ax * delta;
      bendVelArr[idx2 + 1] += az * delta;
      bendStateArr[idx2] += bendVelArr[idx2] * delta;
      bendStateArr[idx2 + 1] += bendVelArr[idx2 + 1] * delta;

      // Wider clamp for taller moss
      bendStateArr[idx2] = THREE.MathUtils.clamp(bendStateArr[idx2], -6.0, 6.0);
      bendStateArr[idx2 + 1] = THREE.MathUtils.clamp(bendStateArr[idx2 + 1], -6.0, 6.0);
    }

    bendAttr.needsUpdate = true;
    prevRenderPos.copy(currentRenderPos);

    // Manual render: scene → render target → post-processing quad
    const cam = get(camera);
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    postMaterial.uniforms.uTime.value = material.uniforms.uTime.value;
    renderer.render(postScene, postCamera);
  });
</script>
<style>
  :global(.lil-slider.lil-active) {
    --focus-color: #ffffff30 !important;
  }
</style>
