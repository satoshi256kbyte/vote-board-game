/**
 * Property-based tests for coordinate parsing and serialization
 *
 * Feature: board-move-selection-ui
 * Tests Properties 11, 12, and 13 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseCoordinate, serializeCoordinate, type Position } from './coordinate';

describe('Coordinate utilities - Property-based tests', () => {
  /**
   * Property 11: 座標パーサーの正確性
   * Validates: Requirements 20.1, 20.2
   *
   * For any valid "row,col" format string, Coordinate_Parser correctly converts
   * to [row, col] array, and returns error for invalid formats
   */
  describe('Property 11: 座標パーサーの正確性', () => {
    it('should parse all valid coordinate strings correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }), (row, col) => {
          const coordString = `${row},${col}`;
          const result = parseCoordinate(coordString);

          expect(result).not.toBeNull();
          expect(result?.row).toBe(row);
          expect(result?.col).toBe(col);
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return null for out-of-range coordinates', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ min: -100, max: -1 }), fc.integer({ min: 8, max: 100 })),
          fc.integer({ min: 0, max: 7 }),
          (invalidValue, validValue) => {
            // Test invalid row
            const invalidRow = `${invalidValue},${validValue}`;
            expect(parseCoordinate(invalidRow)).toBeNull();

            // Test invalid col
            const invalidCol = `${validValue},${invalidValue}`;
            expect(parseCoordinate(invalidCol)).toBeNull();
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should return null for invalid format strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().filter((s) => !/^[0-7],[0-7]$/.test(s)),
            fc.constant(''),
            fc.constant('1'),
            fc.constant('1,'),
            fc.constant(',1'),
            fc.constant('1-1'),
            fc.constant('a,b'),
            fc.constant('1,2,3')
          ),
          (invalidString) => {
            const result = parseCoordinate(invalidString);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });

  /**
   * Property 12: 座標シリアライザーの正確性
   * Validates: Requirements 20.3, 20.4
   *
   * For any valid [row, col] array, Coordinate_Serializer correctly converts
   * to "row,col" format string, and returns error for out-of-range values
   */
  describe('Property 12: 座標シリアライザーの正確性', () => {
    it('should serialize all valid Position objects correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }), (row, col) => {
          const position: Position = { row, col };
          const result = serializeCoordinate(position);

          expect(result).toBe(`${row},${col}`);
          expect(result).toMatch(/^[0-7],[0-7]$/);
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should throw error for out-of-range row values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ min: -100, max: -1 }), fc.integer({ min: 8, max: 100 })),
          fc.integer({ min: 0, max: 7 }),
          (invalidRow, validCol) => {
            const position: Position = { row: invalidRow, col: validCol };
            expect(() => serializeCoordinate(position)).toThrow();
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should throw error for out-of-range col values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 7 }),
          fc.oneof(fc.integer({ min: -100, max: -1 }), fc.integer({ min: 8, max: 100 })),
          (validRow, invalidCol) => {
            const position: Position = { row: validRow, col: invalidCol };
            expect(() => serializeCoordinate(position)).toThrow();
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });

  /**
   * Property 13: 座標変換のラウンドトリップ
   * Validates: Requirements 20.5
   *
   * For any valid coordinate, parse→serialize→parse operation returns
   * the original value (identity property)
   */
  describe('Property 13: 座標変換のラウンドトリップ', () => {
    it('should maintain identity through parse→serialize→parse', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }), (row, col) => {
          const originalString = `${row},${col}`;

          // Parse to Position
          const position = parseCoordinate(originalString);
          expect(position).not.toBeNull();

          // Serialize back to string
          const serialized = serializeCoordinate(position!);

          // Parse again
          const reparsed = parseCoordinate(serialized);

          // Should match original
          expect(reparsed).not.toBeNull();
          expect(reparsed?.row).toBe(row);
          expect(reparsed?.col).toBe(col);
          expect(serialized).toBe(originalString);
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should maintain identity through serialize→parse→serialize', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }), (row, col) => {
          const originalPosition: Position = { row, col };

          // Serialize to string
          const serialized = serializeCoordinate(originalPosition);

          // Parse back to Position
          const parsed = parseCoordinate(serialized);
          expect(parsed).not.toBeNull();

          // Serialize again
          const reserialized = serializeCoordinate(parsed!);

          // Should match original
          expect(parsed?.row).toBe(row);
          expect(parsed?.col).toBe(col);
          expect(reserialized).toBe(serialized);
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });
});
