/**
 * Board SVG Generator for OGP Images
 *
 * Generates SVG representation of the Othello board for OGP images.
 */

import type { BoardState } from '@/types/game';

interface BoardSVGProps {
  boardState: BoardState;
  highlightedCell?: { row: number; col: number };
  width?: number;
  height?: number;
}

/**
 * Generate SVG representation of the Othello board
 */
export function generateBoardSVG({
  boardState,
  highlightedCell,
  width = 400,
  height = 400,
}: BoardSVGProps): string {
  const cellSize = width / 8;
  const discRadius = cellSize * 0.35;

  // Column and row labels
  const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Generate cells
  const cells = boardState.board
    .map((row, rowIndex) =>
      row
        .map((cell, colIndex) => {
          const x = colIndex * cellSize;
          const y = rowIndex * cellSize;
          const isHighlighted =
            highlightedCell?.row === rowIndex && highlightedCell?.col === colIndex;

          // Cell background
          const cellBg = `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${isHighlighted ? '#fde047' : '#10b981'}" stroke="#000" stroke-width="1"/>`;

          // Disc
          let disc = '';
          if (cell === 1) {
            // Black disc
            disc = `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${discRadius}" fill="#000"/>`;
          } else if (cell === 2) {
            // White disc
            disc = `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${discRadius}" fill="#fff" stroke="#d1d5db" stroke-width="2"/>`;
          }

          return cellBg + disc;
        })
        .join('')
    )
    .join('');

  // Generate labels
  const labels = columnLabels
    .map(
      (label, i) =>
        `<text x="${i * cellSize + cellSize / 2}" y="${height + 20}" text-anchor="middle" font-size="14" fill="#374151">${label}</text>`
    )
    .concat(
      rowLabels.map(
        (label, i) =>
          `<text x="${-10}" y="${i * cellSize + cellSize / 2 + 5}" text-anchor="middle" font-size="14" fill="#374151">${label}</text>`
      )
    )
    .join('');

  return `
    <svg width="${width + 40}" height="${height + 40}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(20, 20)">
        ${cells}
        ${labels}
      </g>
    </svg>
  `;
}
