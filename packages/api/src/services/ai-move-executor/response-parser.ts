/**
 * AI手実行サービス - レスポンスパース・バリデーションモジュール
 *
 * AIレスポンスのJSON文字列をパースし、合法手との整合性を検証する純粋関数群。
 */

import type { Position } from '../../lib/othello/index.js';
import type { AIMoveAIResponse, AIMoveParseResult } from './types.js';

const DEFAULT_MAX_DESCRIPTION_LENGTH = 200;

/**
 * position 文字列を "row,col" 形式に正規化
 */
export function normalizePosition(position: string): string | null {
  const trimmed = position.trim();
  const parts = trimmed.split(',');
  if (parts.length !== 2) return null;

  const row = Number(parts[0].trim());
  const col = Number(parts[1].trim());

  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;

  return `${row},${col}`;
}

/**
 * description を指定文字数以内に切り詰め
 */
export function truncateDescription(
  description: string,
  maxLength: number = DEFAULT_MAX_DESCRIPTION_LENGTH
): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength);
}

/**
 * マークダウンのコードブロックからJSON文字列を抽出する
 */
function stripMarkdownCodeBlock(text: string): string {
  const trimmed = text.trim();
  const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(codeBlockRegex);
  if (match) return match[1].trim();
  return trimmed;
}

/**
 * AIレスポンスをパースしバリデーション
 */
export function parseAIMoveResponse(
  responseText: string,
  legalMoves: readonly Position[]
): AIMoveParseResult {
  const jsonText = stripMarkdownCodeBlock(responseText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      success: false,
      position: null,
      description: null,
      error: `JSON parse failed: ${jsonText.slice(0, 100)}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      success: false,
      position: null,
      description: null,
      error: 'Response is not a valid object',
    };
  }

  const response = parsed as AIMoveAIResponse;

  if (typeof response.position !== 'string') {
    return {
      success: false,
      position: null,
      description: null,
      error: 'position is not a string',
    };
  }

  const normalized = normalizePosition(response.position);
  if (normalized === null) {
    return {
      success: false,
      position: null,
      description: null,
      error: `Invalid position format: "${response.position}"`,
    };
  }

  const isLegal = legalMoves.some((m) => `${m.row},${m.col}` === normalized);
  if (!isLegal) {
    return {
      success: false,
      position: null,
      description: null,
      error: `Position ${normalized} is not a legal move`,
    };
  }

  const description = truncateDescription(
    typeof response.description === 'string' ? response.description : ''
  );

  return {
    success: true,
    position: normalized,
    description,
  };
}

/**
 * パース結果をAIレスポンスJSON形式にフォーマットし直す（ラウンドトリップ用）
 */
export function formatAIMoveResponse(position: string, description: string): string {
  return JSON.stringify({ position, description });
}
