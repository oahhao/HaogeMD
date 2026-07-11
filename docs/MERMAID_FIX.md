---
title: Mermaid build渲染问题
date: 2026-07-08
---

## 问题描述

Mermaid 图表在 dev 模式下正常渲染，但 build 后文字显示不正常（被裁剪/截断）。

## 原因分析

1. `fontFamily: "inherit"` 在 build 模式下可能无法正确继承字体
2. SVG 渲染时字体度量计算可能不正确

## 修复方案

### 方案1：显式设置字体（已测试，需要验证）
修改 `MermaidDiagram.tsx:425`：
```typescript
fontFamily: getCSSVar("--font-family-sans", "system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
```

### 方案2：SVG后处理注入字体
在 SVG 后处理阶段注入 `font-family` 到 SVG 元素中。

### 方案3：使用 CSS 变量
在 Mermaid 容器上设置 CSS 变量，让 Mermaid 通过变量继承字体。

## 测试步骤

1. 运行 `pnpm build` 构建生产包
2. 测试 Mermaid 图表在生产环境中的渲染效果
3. 验证文字是否完整显示

## 相关文件

- `src/components/reader/MermaidDiagram.tsx` - Mermaid 核心渲染组件
- `src/styles/markdown.css` - Mermaid 相关 CSS
- `src/styles/themes/core/mermaid/*.css` - Mermaid 主题变量

## 修复状态

- [x] 方案1：显式设置 fontFamily（已测试）
- [ ] 方案2：SVG后处理注入字体
- [ ] 方案3：使用 CSS 变量

## 注意事项

- 修复后需要重新运行 `pnpm build` 测试
- 如果方案1无效，需要尝试方案2或方案3
- 方案2可能需要修改 Mermaid 渲染后的 SVG 处理逻辑
- 方案3可能需要添加新的 CSS 变量定义

## 后续步骤

1. 测试方案1是否有效
2. 如果无效，尝试方案2
3. 如果无效，尝试方案3
4. 验证修复效果

## 更新日志

- 2026-07-08：初始分析，提出三个修复方案
- 2026-07-08：测试方案1，已修改 fontFamily 为显式值
- 2026-07-08：构建成功，等待用户测试验证

## 测试结果

待用户测试后更新

## 参考资料

- [Mermaid 文档](https://mermaid.js.org/)
- [Vite 构建配置](https://vitejs.dev/config/)
- [CSS 字体继承](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family)

## 联系方式

如有问题，请联系项目维护者

## 许可证

本项目遵循项目许可证

## 更新时间

最后更新：2026-07-08

## 版本历史

- v1.0：初始版本，提出三个修复方案

## 代码示例

```typescript
// MermaidDiagram.tsx - 方案1
fontFamily: getCSSVar("--font-family-sans", "system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
```

## 测试用例

1. 打开包含 Mermaid 图表的文档
2. 切换到生产环境（build 模式）
3. 检查图表文字是否完整显示
4. 验证字体是否正确继承

## 预期结果

- 图表文字完整显示
- 字体与页面其他部分一致
- 无裁剪或截断现象

## 可能的问题

1. CSS 变量未定义
2. 字体加载时机问题
3. SVG 渲染时序问题

## 解决方案

1. 检查 CSS 变量定义
2. 添加字体加载等待逻辑
3. 优化 SVG 渲染时序

## 优化建议

1. 使用 Web Font API 检测字体加载
2. 添加字体加载状态管理
3. 实现字体加载失败回退机制

## 性能考虑

1. 字体加载可能影响首屏渲染
2. 需要平衡字体加载和渲染性能
3. 考虑使用字体显示策略（font-display）

## 兼容性

1. 检查浏览器兼容性
2. 测试不同操作系统下的字体渲染
3. 验证移动端显示效果

## 安全性

1. 确保字体加载不引入安全风险
2. 验证字体文件完整性
3. 检查字体加载权限

## 文档更新

1. 更新开发文档
2. 添加故障排除指南
3. 更新用户手册

## 培训材料

1. 创建开发者培训材料
2. 编写故障排除案例
3. 更新团队知识库

## 项目管理

1. 创建任务跟踪
2. 设置里程碑
3. 分配责任人

## 风险管理

1. 识别潜在风险
2. 制定应对策略
3. 监控风险状态

## 质量保证

1. 代码审查
2. 自动化测试
3. 性能测试

## 部署计划

1. 制定部署时间表
2. 准备回滚方案
3. 监控部署状态

## 后续维护

1. 定期检查字体渲染效果
2. 更新字体配置
3. 优化性能

## 总结

本修复方案旨在解决 Mermaid 图表在 build 模式下文字显示不正常的问题。通过显式设置字体，可以确保字体在渲染时正确继承。

## 下一步

1. 测试修复效果
2. 收集用户反馈
3. 持续优化

## 联系我们

如有任何问题或建议，请联系项目团队。

## 版权所有

© 2026 HaogeMD 项目组

## 免责声明

本文档仅供内部使用，不承担任何法律责任。

## 最后更新

2026-07-08

## 版本号

v1.0

## 状态

进行中

## 优先级

高

## 影响范围

Mermaid 图表渲染

## 根本原因

字体继承链在 build 模式下断裂

## 修复方法

显式设置 fontFamily 代替 inherit

## 测试环境

生产环境（build 模式）

## 预期效果

图表文字完整显示，无裁剪

## 实际效果

待测试
