"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function CameraBounds({ landSize = 50 }: { landSize?: number }) {
  useFrame((state) => {
    const controls = state.controls as any;
    if (controls && controls.target) {
      const half = landSize / 2;
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -half, half);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -half, half);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, -5, 20);
    }
    
    if (state.camera) {
      const maxCamDist = landSize * 1.5;
      if (state.camera.position.x > maxCamDist) state.camera.position.x = maxCamDist;
      if (state.camera.position.x < -maxCamDist) state.camera.position.x = -maxCamDist;
      if (state.camera.position.z > maxCamDist) state.camera.position.z = maxCamDist;
      if (state.camera.position.z < -maxCamDist) state.camera.position.z = -maxCamDist;
    }
  });
  return null;
}
