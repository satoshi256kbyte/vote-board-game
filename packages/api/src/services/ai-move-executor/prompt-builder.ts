/**
 * AI手実行サービス - プロンプト構築モジュール
 *
 * 盤面状態と合法手を含むプロンプトを構築する純粋関数群。
 * 手番判定ロジックも含む。
 */

import type { Board, Position } from '../../lib/othello/index.js';
import { CellState } from '../../lib/othello/index.js';

// isAITurn は game-utils.ts に移動済み。既存コードの互換性のため re-export する。
export { isAITurn } from '../../lib/game-utils.js';

const CELL_CHARS: Record<CellState, string> = {
  [CellState.Empty]: '.',
  [CellState.Black]: '●',
  [CellState.White]: '○',
};

/**
 * 盤面を人間が読める8x8グリッド文字列に変換
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
 * AI手決定用プロンプトを構築
 */
export function buildAIMovePrompt(
  board: Board,
  legalMoves: readonly Position[],
  aiSide: 'BLACK' | 'WHITE'
): string {
  const grid = formatBoard(board);
  const movesStr = legalMoves.map((m) => `${m.row},${m.col}`).join('; ');
  const playerLabel = aiSide === 'BLACK' ? '黒（●）' : '白（○）';

  return `## 現在の盤面

${grid}

## 手番

あなたの手番: ${aiSide}（${playerLabel}）

## 合法手一覧

${movesStr}

## 指示

上記の盤面と合法手一覧を分析し、最善の一手を1つ選んでください。

以下を含めてください:
- position: 合法手一覧から選んだ位置（"row,col" 形式）
- description: その手の説明文（200文字以内）。どういう手か、なぜそうするのか、どのような効果があるのかを含めてください。

必ず以下のJSON形式で回答してください:

\`\`\`json
{
  "position": "row,col",
  "description": "説明文（200文字以内）"
}
\`\`\``;
}

/**
 * システムプロンプトを返す
 */
export function getAIMoveSystemPrompt(): string {
  return 'あなたはオセロ（リバーシ）の強いプレイヤーです。盤面の状況を正確に分析し、戦略的に最善の一手を選んでください。角の確保、辺の支配、相手の手を制限する手を優先してください。';
}
