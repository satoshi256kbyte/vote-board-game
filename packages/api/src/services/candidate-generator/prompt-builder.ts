/**
 * PromptBuilder - AIプロンプト構築モジュール
 *
 * 盤面状態と合法手を含む構造化されたプロンプトを構築する純粋関数群。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import type { Board, Position } from '../../lib/othello/index.js';
import { CellState } from '../../lib/othello/index.js';

/** CellState を表示用文字に変換 */
const CELL_CHARS: Record<CellState, string> = {
  [CellState.Empty]: '.',
  [CellState.Black]: '●',
  [CellState.White]: '○',
};

/**
 * 盤面を人間が読める8x8グリッド文字列に変換
 *
 * Requirements: 3.1
 */
export function formatBoard(board: Board): string {
  const header = '  0 1 2 3 4 5 6 7';
  const rows = board.map((row, i) => {
    const cells = row.map((cell) => CELL_CHARS[cell as CellState]).join(' ');
    return `${i} ${cells}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * AIに送信するプロンプトを構築
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export function buildPrompt(
  board: Board,
  legalMoves: readonly Position[],
  currentPlayer: 'BLACK' | 'WHITE'
): string {
  const grid = formatBoard(board);
  const movesStr = legalMoves.map((m) => `${m.row},${m.col}`).join('; ');
  const playerLabel = currentPlayer === 'BLACK' ? '黒（●）' : '白（○）';

  return `## 現在の盤面

${grid}

## 手番

現在の手番: ${currentPlayer}（${playerLabel}）

## 合法手一覧

${movesStr}

## 指示

上記の盤面と合法手一覧を分析し、次の一手の候補を3つ提案してください。

各候補には以下を含めてください:
- position: 合法手一覧から選んだ位置（"row,col" 形式）
- description: その手の説明文（200文字以内）。どういう手か、なぜそうするのか、どのような効果があるのかを含めてください。

必ず以下のJSON形式で回答してください:

\`\`\`json
{
  "candidates": [
    { "position": "row,col", "description": "説明文（200文字以内）" },
    { "position": "row,col", "description": "説明文（200文字以内）" },
    { "position": "row,col", "description": "説明文（200文字以内）" }
  ]
}
\`\`\``;
}

/**
 * システムプロンプトを返す
 *
 * Requirements: 3.7
 */
export function getSystemPrompt(): string {
  return 'あなたはオセロ（リバーシ）の専門家です。盤面の状況を正確に分析し、戦略的に優れた次の一手の候補を提案してください。各候補には、初心者にもわかりやすい説明文を付けてください。';
}
