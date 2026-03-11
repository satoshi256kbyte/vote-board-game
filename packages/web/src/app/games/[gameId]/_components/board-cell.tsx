'use client';

import { ValidMoveIndicator } from './valid-move-indicator';

interface BoardCellProps {
  row: number;
  col: number;
  state: 'empty' | 'black' | 'white';
  isLegalMove: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (row: number, col: number) => void;
  onMouseEnter: (row: number, col: number) => void;
  onMouseLeave: () => void;
  cellSize: number;
  disabled: boolean;
}

export function BoardCell({
  row,
  col,
  state,
  isLegalMove,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  cellSize,
  disabled,
}: BoardCellProps) {
  // 座標をA-H, 1-8形式に変換
  const colLabel = String.fromCharCode(65 + col); // A-H
  const rowLabel = String(row + 1); // 1-8
  const coordinate = `${colLabel}${rowLabel}`;

  // 状態のラベル
  const stateLabel = state === 'empty' ? '空' : state === 'black' ? '黒石' : '白石';

  // aria-labelの構築
  const ariaLabel = isLegalMove
    ? `${coordinate}, ${stateLabel}, 選択可能`
    : `${coordinate}, ${stateLabel}`;

  // クリックハンドラー
  const handleClick = () => {
    if (!disabled) {
      onClick(row, col);
    }
  };

  // マウスエンターハンドラー
  const handleMouseEnter = () => {
    if (!disabled) {
      onMouseEnter(row, col);
    }
  };

  // 石のサイズ（セルサイズの80%）
  const discSize = cellSize * 0.8;

  return (
    <div
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={isSelected}
      className={`
        relative
        border
        border-gray-400
        bg-green-700
        cursor-pointer
        transition-colors
        duration-200
        motion-reduce:transition-none
        ${isHovered && !disabled ? 'bg-green-600' : ''}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
      style={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 選択ハイライト */}
      {isSelected && (
        <div
          className="absolute inset-0 border-4 border-blue-500 pointer-events-none animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* 合法手インジケーター */}
      {isLegalMove && state === 'empty' && (
        <ValidMoveIndicator isHovered={isHovered} cellSize={cellSize} />
      )}

      {/* 石の表示 */}
      {state !== 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`
              rounded-full
              ${state === 'black' ? 'bg-black' : 'bg-white border-2 border-gray-300'}
            `}
            style={{
              width: `${discSize}px`,
              height: `${discSize}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
