interface ValidMoveIndicatorProps {
  isHovered: boolean;
  cellSize: number;
}

export function ValidMoveIndicator({ isHovered, cellSize }: ValidMoveIndicatorProps) {
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
}
