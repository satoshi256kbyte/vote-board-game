/**
 * AICandidateBadge Component
 *
 * AI が生成した候補であることを示すバッジコンポーネント。
 * 紫色のバッジで "AI生成" テキストを表示する。
 *
 * Requirements: 1.3, 1.4, 1.6, 1.7, 9.1
 */

export function AICandidateBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
      aria-label="AI が生成した候補"
    >
      AI生成
    </span>
  );
}
