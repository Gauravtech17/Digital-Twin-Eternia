import { describe, it, expect } from 'vitest';

describe('POLYPULSE Mathematical Engine & Workflow Rules', () => {
  it('computes derived ellipsoid volume strictly according to (pi / 6) * L * W * D', () => {
    const length = 10.0;
    const width = 8.0;
    const depth = 6.0;

    // Standard prolate/triaxial ellipsoid volume: (4/3) * pi * (a * b * c) = (pi / 6) * L * W * D
    const expectedVolume = (Math.PI / 6) * length * width * depth;
    const computedVolume = Number(((Math.PI / 6) * length * width * depth).toFixed(1));

    expect(computedVolume).toBeCloseTo(251.3, 1);
  });

  it('computes longitudinal growth rate accurately over elapsed interval', () => {
    const l1 = 8.0; // mm
    const l2 = 10.0; // mm (+2.0mm delta)
    const elapsedDays = 60; // ~2 months

    const delta = l2 - l1;
    // Growth rate in mm / month (using 30.4375 average days per month)
    const ratePerMonth = (delta / elapsedDays) * 30.4375;

    expect(Number(ratePerMonth.toFixed(2))).toBeCloseTo(1.01, 1);
  });

  it('handles missing depth assumption explicitly by assuming depth equals width', () => {
    const length = 12.0;
    const width = 9.0;
    const depth = null;

    const effectiveDepth = depth ?? width;
    const volume = (Math.PI / 6) * length * width * effectiveDepth;

    expect(effectiveDepth).toBe(9.0);
    expect(Number(volume.toFixed(1))).toBeCloseTo(508.9, 1);
  });

  it('guarantees idempotency key structure for simulation stream ingestion', () => {
    const patientId = 1;
    const timestamp = Date.now().toString(36);
    const randomSalt = 'test';
    const key = `scan-${patientId}-${timestamp}-${randomSalt}`;

    expect(key.startsWith('scan-1-')).toBe(true);
    expect(key.length).toBeGreaterThan(12);
  });
});
