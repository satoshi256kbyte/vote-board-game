/**
 * OGP Board Renderer
 *
 * JSX-based Othello board renderer for @vercel/og (Satori) OGP image generation.
 * Uses flexbox layout (display: 'flex' required on all elements for Satori compatibility).
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1
 */

import type React from 'react';

/**
 * Props for the OGP board renderer
 */
export interface OgpBoardRendererProps {
  /** 8x8 board array (0=empty, 1=black, 2=white) */
  boardState: number[][];
  /** Optional cell to highlight (e.g., candidate move position) */
  highlightedCell?: { row: number; col: number };
  /** Board width/height in pixels (default: 350) */
  size?: number;
}

/**
 * Render an Othello board as Satori-compatible JSX for @vercel/og ImageResponse.
 *
 * - Value 0: green background only (empty cell)
 * - Value 1: black disc
 * - Value 2: white disc with gray border
 * - highlightedCell: yellow background on the specified cell
 */
export function renderOgpBoard(props: OgpBoardRendererProps): React.ReactElement {
  const { boardState, highlightedCell, size = 350 } = props;
  const cellSize = Math.floor(size / 8);
  const discSize = Math.floor(cellSize * 0.7);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${size}px`,
        height: `${size}px`,
        border: '2px solid #000',
      }}
    >
      {boardState.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {row.map((cell, colIndex) => {
            const isHighlighted =
              highlightedCell?.row === rowIndex && highlightedCell?.col === colIndex;

            const bgColor = isHighlighted ? '#fde047' : '#10b981';

            return (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: bgColor,
                  borderRight: '1px solid #000',
                  borderBottom: '1px solid #000',
                }}
              >
                {cell === 1 && (
                  <div
                    style={{
                      display: 'flex',
                      width: `${discSize}px`,
                      height: `${discSize}px`,
                      borderRadius: '50%',
                      backgroundColor: '#000',
                    }}
                  />
                )}
                {cell === 2 && (
                  <div
                    style={{
                      display: 'flex',
                      width: `${discSize}px`,
                      height: `${discSize}px`,
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '2px solid #d1d5db',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
