<div align="center">

# Marimo Moss Ball

<a href="https://leduchieu.com"><img src="https://img.shields.io/badge/-Hieu%20Le-grey"></a><a href="https://imoss.bio"><img src="https://img.shields.io/badge/-imoss.bio-green"></a>
</div>

An interactive WebGL moss ball rendered with **125,000 instanced - 500,000 moss strands** on a rolling sphere. Built with [Threlte](https://threlte.xyz) (Svelte + Three.js).





https://github.com/user-attachments/assets/31d86949-4eca-457e-b7db-4de37fceade8



## Features

### Rendering
- **125,000–500,000 instanced moss blades** via `InstancedMesh` with 6-segment tapered geometry
- **Custom GLSL vertex & fragment shaders** — per-blade wind, clumping, length-preserving bend, gradient color, wrap-around lighting, subsurface glow, and distance fog
- **SMAA at 5× native scale** — morphological edge anti-aliasing with local-contrast adaptation, running on a 5× super-sampled render target
- **Full-screen post-processing shader** — barrel distortion, multi-tap chromatic aberration (outward blue-purple / inward warm-yellow), radial dreamy blur, depth fog, underwater desaturation, and SMAA-like morphological edge anti-aliasing with local-contrast adaptation and subpixel blending

### Physics & Interaction
- **Cursor follow** — ball smoothly tracks the mouse with exponential damping
- **Nudge impulse + spring recovery** — click applies an impulse; a critically-damped spring (~3 s settle time) returns the ball to cursor position
- **Linear momentum & inertia** — blades bend against velocity (air drag) and acceleration (inertia)
- **Torque-based spin** — off-center clicks generate torque; the ball rolls like a wheel on a continuously-updated spin axis
- **Rolling spin decay** — spin persists and damps after linear momentum ends
- **Per-blade spring physics** — every blade has independent bend state/velocity (stiffness 1.0, damping 1.6) updated each frame on the CPU
- **Exposure-aware bending** — blades on the trailing hemisphere bend more than the leading side
- **Tangential spin torque** — rotation pushes blades tangentially, scaled by per-blade response variation, spatial spin pattern, and strand length
- **Random rest offsets** — each blade has a unique rest lean so strands never converge to an X-shape

### Generation & Clumping
- **Flow-field clumping** — 3D noise drives primary sweeping curves + nested secondary detail across the sphere surface
- **Position jitter inside clumps** — blades within locks are slightly raised for organic volume
- **Equator-height bias** — blades are taller near the equator, shorter at the poles
- **Long stray strands** — ~0.1 % of blades are 2–4× length with proportional thinning and brightness boost
- **Shader clumping boost** — speed and spin dynamically increase chaotic lock strength in the vertex shader

### Realism Gimmicks
- **Top-down key + back light + negative front fill** — a hardcoded top spotlight and warm amber backlight create a backlit silhouette; the front is artificially darkened to mimic real-life backlit moss
- **Root-to-tip dark gradient** — base color near the root fades into a brighter tip color, mimicking real moss strand density
- **Baked-in subsurface glow** — bright, warm edge glow applied at high light levels to simulate light scattering through thin moss blades
- **Light-driven color grading** — heavy desaturation in shadow, yellow-gold in mid-bright, amber in strong backlight

### Controls
- **lil-gui control panel** — live adjust blade count, strand length, clump strength, and algae color shift

## Demo

```bash
npm install
npm run dev
```

Open the local URL (usually `http://localhost:5173`) and click the ball to interact with it.

## Usage

The package exports two components:

### `MossBallScene`

A ready-to-use scene wrapper with camera, lighting, and canvas setup.

```svelte
<script>
  import MossBallScene from './components/MossBallScene.svelte'
</script>

<MossBallScene />
```

### `MossBall`

The core component (use inside your own `<Canvas>`).

```svelte
<script>
  import { Canvas, T } from '@threlte/core'
  import MossBall from './components/MossBall.svelte'
  import * as THREE from 'three'
</script>

<Canvas autoRender={false} gl={{ powerPreference: 'high-performance', toneMapping: THREE.AgXToneMapping, outputColorSpace: THREE.SRGBColorSpace, alpha: true }}>
  <T.PerspectiveCamera makeDefault position={[0, 0, 20]} fov={35} near={0.1} far={100} />
  <T.AmbientLight intensity={0.0} />
  <MossBall />
</Canvas>
```

## Files

```
src/
├── components/
│   ├── MossBall.svelte         # Core physics + rendering component
│   └── MossBallScene.svelte    # Scene wrapper with camera & lights
└── shaders/
    ├── mossball.vert            # Vertex shader
    └── mossball.frag            # Fragment shader
```

## Dependencies

- [Svelte](https://svelte.dev) 5
- [Three.js](https://threejs.org)
- [Threlte](https://threlte.xyz) (Core + Extras)
- [lil-gui](https://lil-gui.georgealways.com) (for the control panel)

## Author

**Hieu Le**

## Attribution

This work is licensed under a **Creative Commons Attribution-NonCommercial 4.0 International License**.

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- **NonCommercial** — You may not use the material for commercial purposes.

## License

[Creative Commons Attribution-NonCommercial 4.0 International](LICENSE)
