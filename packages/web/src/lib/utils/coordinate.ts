/**
 * Coordinate parsing and serialization utilities
 *
 * This module provides functions to convert between string coordinates ("row,col")
 * and Position objects ({ row, col }). Used for board move selection UI.
 */

import { z } from 'zod';

/**
 * Position interface matching the API Position type
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * Zod schema for coordinate string validation
 * Format: "row,col" where row and col are 0-7
 */
export const coordinateSchema = z.string().regex(/^[0-7],[0-7]$/, '有効な座標形式ではありません');

/**
 * Parse a coordinate string to a Position object
 *
 * @param coordinate - String in "row,col" format (e.g., "2,3")
 * @returns Position object or null if invalid
 *
 * @example
 * parseCoordinate("2,3") // { row: 2, col: 3 }
 * parseCoordinate("0,7") // { row: 0, col: 7 }
 * parseCoordinate("8,3") // null (out of range)
 * parseCoordinate("a,b") // null (invalid format)
 */
export function parseCoordinate(coordinate: string): Position | null {
  // Validate format using Zod schema
  const result = coordinateSchema.safeParse(coordinate);
  if (!result.success) {
    return null;
  }

  // Parse the validated string
  const match = coordinate.match(/^([0-7]),([0-7])$/);
  if (!match) {
    return null;
  }

  return {
    row: parseInt(match[1], 10),
    col: parseInt(match[2], 10),
  };
}

/**
 * Serialize a Position object to a coordinate string
 *
 * @param position - Position object with row and col (0-7)
 * @returns String in "row,col" format
 * @throws Error if position is out of range
 *
 * @example
 * serializeCoordinate({ row: 2, col: 3 }) // "2,3"
 * serializeCoordinate({ row: 0, col: 7 }) // "0,7"
 * serializeCoordinate({ row: 8, col: 3 }) // throws Error
 */
export function serializeCoordinate(position: Position): string {
  // Validate range
  if (position.row < 0 || position.row > 7 || position.col < 0 || position.col > 7) {
    throw new Error(`座標が範囲外です: row=${position.row}, col=${position.col}`);
  }

  return `${position.row},${position.col}`;
}
