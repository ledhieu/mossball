<script>
  import { Canvas, T } from '@threlte/core';
  import MossBall from './MossBall.svelte';
  import * as THREE from 'three';
</script>

<div style="position:fixed;inset:0;background:#050810;overflow:hidden;">
  <Canvas
    autoRender={false}
    gl={{
      powerPreference: 'high-performance',
      toneMapping: THREE.AgXToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
      alpha: true
    }}
  >
    <T.PerspectiveCamera
      makeDefault
      position={[0, 0, 20]}
      fov={35}
      near={0.1}
      far={100}
      oncreate={(ref) => { ref.lookAt(0, 0, 0); }}
    />

    <T.AmbientLight intensity={0.0} />
    <T.DirectionalLight position={[5, 10, 7]} intensity={1.2} color="#fff4e0" />
    <T.DirectionalLight position={[-3, -2, -5]} intensity={0.3} color="#d0e0ff" />

    <MossBall />
  </Canvas>
</div>
