import React, { memo } from "react";

interface AppIconProps {
  size?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * HaogeMD 应用图标组件（内联 SVG + PNG 图标嵌入）
 *
 * 使用新设计的 HaogeMD 图标，保留 SVG 外框和主题色适配
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
        <filter id="appIconGlowOuter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="iconClip">
          <rect x="112" y="112" width="800" height="800" rx="180" />
        </clipPath>
      </defs>
      {/* 外框发光 */}
      <rect
        x="112" y="112" width="800" height="800" rx="180"
        fill="none" stroke="url(#appIconBoxGrad)" strokeWidth="20"
        filter="url(#appIconGlowOuter)" opacity="0.6"
      />
      {/* 外框 */}
      <rect
        x="112" y="112" width="800" height="800" rx="180"
        fill="var(--bg-page, #0A0B10)" fillOpacity="0.9"
        stroke="url(#appIconBoxGrad)" strokeWidth="14"
      />
      {/* 新图标嵌入 */}
      <image
        href="/images/haogemd-icon.png"
        x="112" y="112"
        width="800" height="800"
        clipPath="url(#iconClip)"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
});

AppIcon.displayName = "AppIcon";

export default AppIcon;
