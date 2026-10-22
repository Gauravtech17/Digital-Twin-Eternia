import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  generateScanPath,
  DEFAULT_SCAN_PATH_CONFIG,
  DEFAULT_SYNTHETIC_TARGET,
} from '../components/simulation/ScanPathGenerator';

describe('Spatial Scan Simulation Engine', () => {
  it('generates the deterministic 42-point serpentine raster path', () => {
    const steps = generateScanPath(DEFAULT_SCAN_PATH_CONFIG);
    expect(steps).toHaveLength(42);

    // Verify row and column indices
    expect(steps[0].row).toBe(0);
    expect(steps[0].col).toBe(0);
    expect(steps[41].row).toBe(5);

    // Verify coordinates stay bounded within defined scanning region (accounting for floating point math)
    steps.forEach((step) => {
      expect(step.position.x).toBeGreaterThanOrEqual(-0.3601);
      expect(step.position.x).toBeLessThanOrEqual(0.3601);
      expect(step.position.y).toBeGreaterThanOrEqual(-0.1201);
      expect(step.position.y).toBeLessThanOrEqual(0.4201);
      expect(step.position.z).toBeCloseTo(0.12, 3);
    });
  });

  it('implements genuine serpentine raster traversal (reversing direction on odd rows)', () => {
    const steps = generateScanPath(DEFAULT_SCAN_PATH_CONFIG);

    // Row 0 (even): left-to-right (increasing X)
    const row0 = steps.filter((s) => s.row === 0);
    expect(row0[0].position.x).toBeLessThan(row0[row0.length - 1].position.x);

    // Row 1 (odd): right-to-left (decreasing X)
    const row1 = steps.filter((s) => s.row === 1);
    expect(row1[0].position.x).toBeGreaterThan(row1[row1.length - 1].position.x);

    // Row 2 (even): left-to-right (increasing X)
    const row2 = steps.filter((s) => s.row === 2);
    expect(row2[0].position.x).toBeLessThan(row2[row2.length - 1].position.x);
  });

  it('correctly and deterministically detects target intersection with synthetic polyp candidate', () => {
    const steps = generateScanPath(DEFAULT_SCAN_PATH_CONFIG);
    const targetSteps = steps.filter((s) => s.isTargetIntersection);

    // At least one step must intersect the target region
    expect(targetSteps.length).toBeGreaterThanOrEqual(1);

    // Non-intersecting steps must exist as well
    const nonTargetSteps = steps.filter((s) => !s.isTargetIntersection);
    expect(nonTargetSteps.length).toBeGreaterThan(0);

    // Target steps must have distanceToTarget <= radius
    targetSteps.forEach((s) => {
      expect(s.distanceToTarget).toBeLessThanOrEqual(DEFAULT_SYNTHETIC_TARGET.radius);
    });

    // Non-target steps must have distanceToTarget > radius
    nonTargetSteps.forEach((s) => {
      expect(s.distanceToTarget).toBeGreaterThan(DEFAULT_SYNTHETIC_TARGET.radius);
    });
  });

  it('shares stable synthetic polyp metadata with Digital Twin specifications', () => {
    expect(DEFAULT_SYNTHETIC_TARGET.id).toBe('SYNTH-POLYP-2026-081');
    expect(DEFAULT_SYNTHETIC_TARGET.position.x).toBeCloseTo(0.12, 2);
    expect(DEFAULT_SYNTHETIC_TARGET.position.y).toBeCloseTo(0.22, 2);
    expect(DEFAULT_SYNTHETIC_TARGET.position.z).toBeCloseTo(0.00, 2);
    expect(DEFAULT_SYNTHETIC_TARGET.lengthMm).toBe(10.8);
    expect(DEFAULT_SYNTHETIC_TARGET.widthMm).toBe(7.4);
    expect(DEFAULT_SYNTHETIC_TARGET.depthMm).toBe(6.8);
  });
});
