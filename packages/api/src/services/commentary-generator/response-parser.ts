/**
 * ResponseParser - AIレスポンスパース・バリデーションモジュール
 *
 * AIレスポンスのJSON文字列をパースし、解説文を抽出・バリデーションする純粋関数群。
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import type { AICommentaryResponse, CommentaryParseResult } from './types.js';

const DEFAULT_MAX_CONTENT_LENGTH = 500;

/**
 * マークダウンのコードブロックからテキストを抽出する
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
 * 解説文を指定文字数以内に切り詰め
 *
 * Requirements: 4.5
 *
 * @param content - 切り詰め対象の文字列
 * @param maxLength - 最大文字数（デフォルト: 500）
 * @returns 切り詰め済みの文字列
 */
export function truncateContent(
  content: string,
  maxLength: number = DEFAULT_MAX_CONTENT_LENGTH
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength);
}

/**
 * AIレスポンスをパースし、解説文を抽出・バリデーション
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 *
 * - JSONパースを試み、content フィールドを抽出する (4.1)
 * - JSONパース失敗時はレスポンス全体をプレーンテキストとして扱う (4.2)
 * - content が空でないことを検証する (4.3, 4.4)
 * - 500文字を超過する場合は切り詰める (4.5)
 * - パース結果として content を含むオブジェクトを返す (4.6)
 *
 * @param responseText - AIからのレスポンス文字列
 * @returns パース結果
 */
export function parseCommentaryResponse(responseText: string): CommentaryParseResult {
  // マークダウンコードブロックを除去
  const strippedText = stripMarkdownCodeBlock(responseText);

  let content: string;

  // JSONパース試行 (Requirement 4.1)
  try {
    const parsed: unknown = JSON.parse(strippedText);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'content' in parsed &&
      typeof (parsed as AICommentaryResponse).content === 'string'
    ) {
      content = (parsed as AICommentaryResponse).content;
    } else {
      // JSONだがcontent フィールドがない場合、プレーンテキストとして扱う
      content = strippedText;
    }
  } catch {
    // JSONパース失敗時はプレーンテキストとして扱う (Requirement 4.2)
    content = strippedText;
  }

  // 空文字チェック (Requirement 4.3, 4.4)
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return {
      commentary: null,
      error: 'Commentary content is empty',
    };
  }

  // 500文字以内に切り詰め (Requirement 4.5)
  const truncated = truncateContent(trimmedContent);

  // パース結果を返す (Requirement 4.6)
  return {
    commentary: {
      content: truncated,
    },
  };
}
