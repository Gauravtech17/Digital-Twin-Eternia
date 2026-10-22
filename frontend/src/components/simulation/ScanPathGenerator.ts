import * as THREE from 'three';

export interface ScanStep {
  index: number;
  row: number;
  col: number;
  position: THREE.Vector3;
  isTargetIntersection: boolean;
  distanceToTarget: number;
}

export interface SyntheticTargetConfig {
  id: string;
  position: THREE.Vector3;
  radius: number;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  label: string;
}

export interface ScanPathConfig {
  rows: number;
  cols: number;
  xRange: [number, number];
  yRange: [number, number];
  zPlane: number;
  target: SyntheticTargetConfig;
}

// Default deterministic synthetic polyp target positioned in the upper endometrial cavity
export const DEFAULT_SYNTHETIC_TARGET: SyntheticTargetConfig = {
  id: 'SYNTH-POLYP-2026-081',
  position: new THREE.Vector3(0.12, 0.22, 0.00),
  radius: 0.16,
  lengthMm: 10.8,
  widthMm: 7.4,
  depthMm: 6.8,
  label: 'Endometrial Polyp Candidate (Illustrative)',
};

export const DEFAULT_SCAN_PATH_CONFIG: ScanPathConfig = {
  rows: 6,
  cols: 7,
  xRange: [-0.36, 0.36],
  yRange: [0.42, -0.12],
  zPlane: 0.12,
  target: DEFAULT_SYNTHETIC_TARGET,
};

/**
 * Generates a deterministic serpentine raster scanning path across the anatomical region.
 * Serpentine order: Row 0 (L -> R), Row 1 (R -> L), Row 2 (L -> R)...
 * Computes exact spatial cross-sectional intersection with the synthetic target.
 */
export function generateScanPath(config: ScanPathConfig = DEFAULT_SCAN_PATH_CONFIG): ScanStep[] {
  const { rows, cols, xRange, yRange, zPlane, target } = config;
  const steps: ScanStep[] = [];

  const xSpan = xRange[1] - xRange[0];
  const ySpan = yRange[1] - yRange[0];

  const dx = cols > 1 ? xSpan / (cols - 1) : 0;
  const dy = rows > 1 ? ySpan / (rows - 1) : 0;

  let index = 0;

  for (let r = 0; r < rows; r++) {
    // Current Y level (progressing from yRange[0] down to yRange[1])
    const y = yRange[0] + r * dy;

    // Serpentine direction: even rows left-to-right, odd rows right-to-left
    const isReversed = r % 2 === 1;

    for (let c = 0; c < cols; c++) {
      const colIdx = isReversed ? cols - 1 - c : c;
      const x = xRange[0] + colIdx * dx;
      const pos = new THREE.Vector3(x, y, zPlane);

      // Planar projection distance in coronal scan plane (X, Y)
      const deltaX = x - target.position.x;
      const deltaY = y - target.position.y;
      const dist2d = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const isTargetIntersection = dist2d <= target.radius;

      steps.push({
        index,
        row: r,
        col: colIdx,
        position: pos,
        isTargetIntersection,
        distanceToTarget: dist2d,
      });

      index++;
    }
  }

  return steps;
}
