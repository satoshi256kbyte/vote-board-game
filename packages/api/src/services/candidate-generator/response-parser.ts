/**
 * ResponseParser - AIレスポンスパース・バリデーションモジュール
 *
 * AIレスポンスのJSON文字列をパースし、合法手との整合性を検証する純粋関数群。
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import type { Position } from '../../lib/othello/index.js';
import type { AIResponse, ParseResult } from './types.js';

const DEFAULT_MAX_DESCRIPTION_LENGTH = 200;

/**
 * 候補の position 文字列を "row,col" 形式に正規化
 *
 * @param position - パース対象の文字列
 * @returns 正規化された "row,col" 文字列、または無効な場合 null
 */
export function normalizePosition(position: string): string | null {
  const trimmed = position.trim();
  const parts = trimmed.split(',');
  if (parts.length !== 2) {
    return null;
  }

  const row = Number(parts[0].trim());
  const col = Number(parts[1].trim());

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  if (row < 0 || row > 7 || col < 0 || col > 7) {
    return null;
  }

  return `${row},${col}`;
}

/**
 * description を指定文字数以内に切り詰め
 *
 * Requirements: 4.5, 4.6
 *
 * @param description - 切り詰め対象の文字列
 * @param maxLength - 最大文字数（デフォルト: 200）
 * @returns 切り詰め済みの文字列
 */
export function truncateDescription(
  description: string,
  maxLength: number = DEFAULT_MAX_DESCRIPTION_LENGTH
): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.slice(0, maxLength);
}

/**
 * マークダウンのコードブロックからJSON文字列を抽出する
 *
 * AIがJSONをマークダウンコードブロック（```json ... ```）で囲む場合があるため、
 * その場合はコードブロック内のテキストを抽出する。
 */
function stripMarkdownCodeBlock(text: string): string {
  const trimmed = text.trim();
  const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(codeBlockRegex);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Position が合法手一覧に含まれるかチェック
 */
function isLegalMove(normalizedPosition: string, legalMoves: readonly Position[]): boolean {
  return legalMoves.some((move) => `${move.row},${move.col}` === normalizedPosition);
}

/**
 * AIレスポンスのJSON文字列をパースし、バリデーション済み候補配列を返す
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 *
 * @param responseText - AIからのレスポンス文字列
 * @param legalMoves - 合法手一覧
 * @returns パース結果（有効な候補とエラーメッセージ）
 */
export function parseAIResponse(
  responseText: string,
  legalMoves: readonly Position[]
): ParseResult {
  const errors: string[] = [];

  // マークダウンコードブロックを除去
  const jsonText = stripMarkdownCodeBlock(responseText);

  // JSONパース（Requirement 4.1, 4.2）
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    errors.push(`JSON parse failed: ${jsonText.slice(0, 100)}`);
    return { candidates: [], errors };
  }

  // candidates 配列の存在チェック
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('candidates' in parsed) ||
    !Array.isArray((parsed as AIResponse).candidates)
  ) {
    errors.push('Response does not contain a valid candidates array');
    return { candidates: [], errors };
  }

  const aiResponse = parsed as AIResponse;
  const candidates = aiResponse.candidates;
  const result: ParseResult = { candidates: [], errors };

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    // position の型チェック
    if (typeof candidate.position !== 'string') {
      errors.push(`Candidate ${i}: position is not a string`);
      continue;
    }

    // description の型チェック
    if (typeof candidate.description !== 'string') {
      errors.push(`Candidate ${i}: description is not a string`);
      continue;
    }

    // position の正規化（Requirement 4.3）
    const normalized = normalizePosition(candidate.position);
    if (normalized === null) {
      errors.push(`Candidate ${i}: invalid position format "${candidate.position}"`);
      continue;
    }

    // 合法手チェック（Requirement 4.3, 4.4）
    if (!isLegalMove(normalized, legalMoves)) {
      errors.push(`Candidate ${i}: position ${normalized} is not a legal move`);
      continue;
    }

    // description の切り詰め（Requirement 4.5, 4.6）
    const description = truncateDescription(candidate.description);

    result.candidates.push({
      position: normalized,
      description,
    });
  }

  return result;
}
