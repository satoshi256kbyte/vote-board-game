import { memo } from 'react';

interface ValidMoveIndicatorProps {
  isHovered: boolean;
  cellSize: number;
}

/**
 * 合法手を示すインジケーターコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでメモ化し、propsが変更されない限り再レンダリングを防止
 */
export const ValidMoveIndicator = memo(function ValidMoveIndicator({
  isHovered,
  cellSize,
}: ValidMoveIndicatorProps) {
  // 円のサイズはセルサイズの40%
  const circleSize = cellSize * 0.4;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <div
        className={`
          rounded-full
          transition-colors
          duration-200
          motion-reduce:transition-none
          ${isHovered ? 'bg-green-400' : 'bg-green-200'}
        `}
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
        }}
      />
    </div>
  );
});
