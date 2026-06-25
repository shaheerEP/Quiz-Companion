import * as THREE from 'three';

const geometries: THREE.BufferGeometry[] = [];

export const getCurvedGeometry = (level: number) => {
  const safeLevel = Math.max(0, Math.min(4, Math.round(level || 0)));
  
  if (geometries[safeLevel]) return geometries[safeLevel];

  if (safeLevel === 0) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.computeBoundingSphere();
    if (box.boundingSphere) box.boundingSphere.radius = 10000;
    geometries[0] = box;
    return box;
  }

  // max radius for a 1x1 square is 0.5
  const radius = (safeLevel / 4) * 0.5;

  const shape = new THREE.Shape();
  const x = -0.5;
  const y = -0.5;
  const w = 1;
  const d = 1;

  if (radius === 0) {
    shape.moveTo(x, y);
    shape.lineTo(x + w, y);
    shape.lineTo(x + w, y + d);
    shape.lineTo(x, y + d);
    shape.lineTo(x, y);
  } else {
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + d - radius);
    shape.quadraticCurveTo(x, y + d, x + radius, y + d);
    shape.lineTo(x + w - radius, y + d);
    shape.quadraticCurveTo(x + w, y + d, x + w, y + d - radius);
    shape.lineTo(x + w, y + radius);
    shape.quadraticCurveTo(x + w, y, x + w - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 8 });
  geometry.translate(0, 0, -0.5); // Center along Z before rotation
  geometry.rotateX(Math.PI / 2); // Now Y goes from -0.5 to 0.5
  
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius = 10000;
  
  geometries[safeLevel] = geometry;
  return geometry;
};

export const getRoofGeometry = (segments: number) => {
  const cacheKey = 100 + segments;
  if (geometries[cacheKey]) return geometries[cacheKey];
  const cone = new THREE.ConeGeometry(0.71, 1, segments);
  cone.computeBoundingSphere();
  if (cone.boundingSphere) cone.boundingSphere.radius = 10000;
  geometries[cacheKey] = cone;
  return cone;
};

export const getWedgeGeometry = () => {
  if (geometries[200]) return geometries[200];
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(-0.5, 0.5); // Triangle cross-section
  shape.lineTo(-0.5, -0.5);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  geometry.translate(0, 0, -0.5); // Center Z
  
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius = 10000;
  
  geometries[200] = geometry;
  return geometry;
};

export const getPyramidGeometry = () => {
  if (geometries[201]) return geometries[201];
  // A pyramid is a 4-sided cone
  // Radius needs to be sqrt(0.5^2 + 0.5^2) = 0.7071 to exactly fit a 1x1 base
  const geometry = new THREE.ConeGeometry(0.7071, 1, 4);
  geometry.rotateY(Math.PI / 4); // Align the base to the grid axes
  
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius = 10000;
  
  geometries[201] = geometry;
  return geometry;
};


