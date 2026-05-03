# Moss Ball

An interactive WebGL moss ball rendered with **125,000 instanced moss strands** on a rolling sphere. Built with [Threlte](https://threlte.xyz) (Svelte + Three.js).

## Features

- **125,000-500,000 instanced moss blades** with per-blade physics
- **Directional clumping** — flow-field noise creates organic hair-lock texture without bald spots
- **Interactive physics** — click to nudge the ball; it rolls, spins, and settles with spring physics
- **Wind simulation** — procedural wind affects blade bending in real time
- **Post-processing** — barrel distortion, chromatic aberration, dreamy blur, and edge anti-aliasing
- **Custom shaders** — handwritten GLSL vertex & fragment shaders
- **Real-time controls** — adjustable blade count, length, clumping, and color via lil-gui

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
