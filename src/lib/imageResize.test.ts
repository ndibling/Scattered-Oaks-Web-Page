import { describe, it, expect } from 'vitest';
import { computeResizedDimensions, MAX_DIMENSION } from './imageResize';

describe('computeResizedDimensions', () => {
  it('leaves an image already under the max dimension untouched', () => {
    expect(computeResizedDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('leaves an image exactly at the max dimension untouched', () => {
    expect(computeResizedDimensions(MAX_DIMENSION, 1000)).toEqual({
      width: MAX_DIMENSION,
      height: 1000,
    });
  });

  it('scales down a wide image, preserving aspect ratio', () => {
    // 4000x3000, 4:3 -> longest edge (width) capped at 2000
    expect(computeResizedDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 });
  });

  it('scales down a tall image, preserving aspect ratio', () => {
    // 3000x4000, 3:4 -> longest edge (height) capped at 2000
    expect(computeResizedDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });

  it('rounds to whole pixels', () => {
    const { width, height } = computeResizedDimensions(5001, 3333);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
    expect(width).toBe(2000);
    expect(height).toBe(1333);
  });

  it('respects a custom maxDimension', () => {
    expect(computeResizedDimensions(1000, 500, 400)).toEqual({ width: 400, height: 200 });
  });
});
