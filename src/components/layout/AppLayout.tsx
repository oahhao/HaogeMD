import React, { memo } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 全屏布局容器。
 * Task 13 沉浸式布局：TitleBar 和 StatusBar 已移至 App.tsx 中作为
 * position: fixed 的兄弟元素。AppLayout 只是一个简单的全屏 passthrough。
 */
const AppLayout: React.FC<AppLayoutProps> = memo(({ children }) => {
  return <div className="w-full h-screen">{children}</div>;
});

AppLayout.displayName = "AppLayout";

export default AppLayout;
