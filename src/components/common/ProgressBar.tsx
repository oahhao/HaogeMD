import React, { memo } from "react";

interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = memo(({ percentage }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full h-0.5"
      style={{
        background: "var(--divider, rgba(100, 200, 200, 0.05))",
      }}
    >
      {/* 使用 scaleX 代替 width 动画，避免触发布局重排 */}
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "var(--accent-cyan, #00FFFF)",
          transform: `scaleX(${clampedPercentage / 100})`,
          transformOrigin: "left",
          transition: "transform 200ms ease-out",
          willChange: "transform",
          boxShadow: "0 0 4px rgba(0, 255, 255, 0.3)",
        }}
      />
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
