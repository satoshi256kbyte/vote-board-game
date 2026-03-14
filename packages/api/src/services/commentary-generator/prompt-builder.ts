/**
 * PromptBuilder - 対局解説生成用プロンプト構築モジュール
 *
 * 盤面状態、手履歴、石数、手番情報を含む構造化されたプロンプトを構築する純粋関数群。
 * CandidateGenerator の formatBoard を再利用し、解説生成に特化したプロンプトを構築する。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

import type { Board } from '../../lib/othello/index.js';
import { CellState } from '../../lib/othello/index.js';
import type { MoveEntity } from '../../lib/dynamodb/types.js';

/** CellState を表示用文字に変換 */
const CELL_CHARS: Record<CellState, string> = {
  [CellState.Empty]: '.',
  [CellState.Black]: '●',
  [CellState.White]: '○',
};

/**
 * 盤面を人間が読める8x8グリッド文字列に変換
 *
 * CandidateGenerator の formatBoard と同じロジックを使用。
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
 * 手履歴を人間が読める文字列に変換
 *
 * 各手をターン番号、位置、手番（黒/白）の形式でフォーマットする。
 *
 * Requirements: 3.2
 */
export function formatMoveHistory(moves: MoveEntity[]): string {
  if (moves.length === 0) {
    return 'まだ手が打たれていません。';
  }

  return moves
    .map((move) => {
      const sideLabel = move.side === 'BLACK' ? '黒（●）' : '白（○）';
      const playedByLabel = move.playedBy === 'AI' ? 'AI' : '集合知';
      return `ターン${move.turnNumber}: ${sideLabel}（${playedByLabel}）が ${move.position} に着手`;
    })
    .join('\n');
}

/**
 * 解説生成用プロンプトを構築
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10
 */
export function buildCommentaryPrompt(
  board: Board,
  moves: MoveEntity[],
  discCount: { black: number; white: number },
  currentPlayer: 'BLACK' | 'WHITE',
  aiSide: 'BLACK' | 'WHITE'
): string {
  const grid = formatBoard(board);
  const moveHistory = formatMoveHistory(moves);
  const playerLabel = currentPlayer === 'BLACK' ? '黒（●）' : '白（○）';
  const aiLabel = aiSide === 'BLACK' ? '黒（●）' : '白（○）';
  const collectiveSide = aiSide === 'BLACK' ? 'WHITE' : 'BLACK';
  const collectiveLabel = collectiveSide === 'BLACK' ? '黒（●）' : '白（○）';

  return `## 現在の盤面

${grid}

## 石数

黒（●）: ${discCount.black}個
白（○）: ${discCount.white}個

## 手番

現在の手番: ${currentPlayer}（${playerLabel}）

## 対局構図

AI側: ${aiSide}（${aiLabel}）
集合知側: ${collectiveSide}（${collectiveLabel}）

## 手履歴

${moveHistory}

## 指示

上記の対局情報を分析し、ここまでの対局内容の解説を生成してください。

以下の内容を含めてください:
- 直近の手（最新ターン）の戦略的意味の分析
- 現在の形勢判断
- 初心者にもわかりやすい説明

解説文は500文字以内で記述してください。

必ず以下のJSON形式で回答してください:

\`\`\`json
{
  "content": "解説文（500文字以内）"
}
\`\`\``;
}

/**
 * 解説生成用システムプロンプトを返す
 *
 * Requirements: 3.8
 */
export function getCommentarySystemPrompt(): string {
  return 'あなたはオセロ（リバーシ）の対局解説者です。対局の流れを正確に分析し、初心者にもわかりやすく解説してください。盤面の形勢判断、戦略的な意味、今後の展開予想を含めた解説を行ってください。';
}
