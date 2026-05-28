import React, { memo } from "react";

interface AppIconProps {
  size?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * ErgeMD 应用图标组件（内联 SVG，支持主题色自适应）
 *
 * 颜色映射：
 *   --accent-cyan  → 边框渐变起点 + 文字色
 *   --accent-pink  → 边框渐变终点 + 图标色（如未定义则用 --accent-cyan）
 *   --bg-page      → 图标背景填充
 */
const AppIcon: React.FC<AppIconProps> = memo(({ size, style, className }) => {
  const w = typeof size === "number" ? `${size}px` : size;
  const h = w;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={w}
      height={h}
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="appIconBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-cyan, #00E5FF)" />
          <stop offset="100%" stopColor="var(--accent-pink, #FF007F)" />
        </linearGradient>
        <linearGradient id="appIconNeonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-pink, #FF007F)" />
          <stop offset="100%" stopColor="var(--accent-pink, #FF5E99)" />
        </linearGradient>
        <filter id="appIconSubtleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="appIconGlowOuter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 外框 */}
      <rect
        x="112" y="112" width="800" height="800" rx="180"
        fill="none" stroke="url(#appIconBoxGrad)" strokeWidth="20"
        filter="url(#appIconGlowOuter)" opacity="0.6"
      />
      <rect
        x="112" y="112" width="800" height="800" rx="180"
        fill="var(--bg-page, #0A0B10)" fillOpacity="0.9"
        stroke="url(#appIconBoxGrad)" strokeWidth="14"
      />
      {/* 图标 */}
      <g
        fill="none" stroke="url(#appIconNeonGrad)" strokeWidth="40"
        strokeLinecap="round" strokeLinejoin="round"
        filter="url(#appIconSubtleGlow)"
      >
        <path d="M 510 260 L 330 260 L 330 620 L 510 620" />
        <path d="M 480 440 L 740 440 M 650 300 L 740 440 L 650 580" />
      </g>
      {/* 文字 */}
      <text
        x="512" y="790" fontFamily="sans-serif" fontSize="80" fontWeight="600"
        fill="var(--accent-cyan, #00F0FF)" textAnchor="middle" letterSpacing="4"
        filter="url(#appIconSubtleGlow)"
      >
        ErgeMD
      </text>
    </svg>
  );
});

AppIcon.displayName = "AppIcon";

export default AppIcon;
