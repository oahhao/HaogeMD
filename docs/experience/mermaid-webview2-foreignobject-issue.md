# Mermaid 图表在 WebView2 下 foreignObject 渲染问题

> **问题发现时间**: 2026-07-10
> **解决时间**: 2026-07-10
> **影响范围**: Tauri 打包后的 build 版本（WebView2）

---

## 问题描述

### 现象

- **dev 模式** (`pnpm dev`)：Mermaid 流程图预览窗口文字正常居中显示
- **build 版本**（Tauri 打包后的 exe）：预览窗口文字被截断，只显示约 1%，几乎不可见

### 影响图表类型

- Flowchart（流程图）节点标签
- 其他使用 `foreignObject` 渲染文字的 Mermaid 图表类型

---

## 根本原因

### 技术原因

**WebView2 不解析 foreignObject 内 HTML 元素的 `style` 属性。**

具体表现：

| 属性 | dev（浏览器） | build（WebView2） |
|------|--------------|-------------------|
| `divStyle` (SVG属性) | `display: flex` | `display: flex` (字符串正确) |
| `divEl.style.display` (DOM) | `"flex"` | `"not set"` |
| `getComputedStyle().display` | `"flex"` | `"block"` (默认值) |

### 调试数据对比

```json
// dev 环境
{
  "divExists": true,
  "divDisplay": "flex",
  "computedDisplay": "flex"
}

// build 环境
{
  "divExists": true,
  "divDisplay": "not set",
  "computedDisplay": "block"
}
```

### SVG 结构分析

Mermaid 生成的节点标签结构：

```html
<g class="node default" transform="translate(78, 35)">
  <rect class="basic label-container" width="140" height="54" fill="#2e2e38" stroke="#00ffff"/>
  <g class="label" transform="translate(-40, -12)">
    <rect fill="#2e2e38" stroke="#00ffff"/>
    <foreignObject width="80" height="24">
      <div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; ...">
        <span class="nodeLabel"><p>主数据接口</p></span>
      </div>
    </foreignObject>
  </g>
</g>
```

**关键点**：
- `foreignObject` 用于在 SVG 中嵌入 HTML
- 内部 `<div>` 的 `style` 属性在 WebView2 中不被解析到 DOM 的 `style` 对象
- 因此 `display: flex` 等布局样式完全失效，文字使用默认的 `display: block`

### 为什么 `htmlLabels: false` 不能解决

Mermaid 配置 `htmlLabels: false` 只影响**边标签**（edge labels），**节点标签**（node labels）在 flowchart 中始终使用 `foreignObject` 渲染，无论该配置如何设置。

---

## 尝试过的方案（均失败）

### 方案 1: CSS 覆盖

```css
.markdown-body .mermaid foreignObject > div {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
```

**结果**：dev 正常，build 无效。WebView2 不解析 foreignObject 内 HTML 的样式。

### 方案 2: 内联样式 + `!important`

```typescript
divEl.style.display = "flex";
divEl.style.setProperty("display", "flex", "important");
```

**结果**：dev 正常，build 无效。`style` 属性写入后立即被忽略。

### 方案 3: SVG `<style>` 标签注入

```typescript
const style = `
foreignObject > div {
  display: flex !important;
  ...
}
`;
result = result.replace("</style>", `${style}</style>`);
```

**结果**：dev 正常，build 无效。CSS 规则不作用于 foreignObject 内的 HTML。

### 方案 4: 放大 foreignObject 尺寸

```typescript
result = result.replace(
  /<foreignObject width="([^"]*)" height="([^"]*)"/g,
  (match, w, h) => `<foreignObject width="${w*1.5}" height="${h*2}">`
);
```

**结果**：渲染错乱。因为 `<g class="label" transform="translate(-40, -12)">` 的定位关系，放大后文字超出节点边界。

---

## 最终解决方案

### 核心思路

**绕过 foreignObject，使用原生 SVG `<text>` 元素。**

WebView2 完全支持 SVG `<text>` 元素的渲染（边标签已验证），所以将节点标签的 `foreignObject` 转换为原生 `<text>`。

### 实现代码

在 `MermaidDiagram.tsx` 的 `fixSvgColors()` 函数中：

```typescript
// 将节点标签的 foreignObject 转换为原生 SVG text 元素
result = result.replace(
  /<foreignObject width="([^"]*)" height="([^"]*)"[^>]*>([\s\S]*?)<span class="nodeLabel"[^>]*>(?:<p>)?([^<]*)(?:<\/p>)?<\/span>[\s\S]*?<\/foreignObject>/g,
  (match, width, height, _before, text) => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (w > 0 && h > 0 && text) {
      const x = w / 2;
      const y = h / 2;
      const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="${ptc}">${escapedText}</text>`;
    }
    return match;
  }
);
```

### 坐标计算原理

```
<g class="label" transform="translate(-40, -12)">
  <foreignObject width="80" height="24">
    <!-- foreignObject 在 g 局部坐标 (0, 0) -->
    <!-- 其中心在 g 局部坐标为 (40, 12) = (80/2, 24/2) -->
  </foreignObject>
</g>
```

替换后的 `<text>` 放在同一个 `<g>` 内：
```html
<text x="40" y="12" text-anchor="middle" dominant-baseline="central">文字</text>
```

### 配套修改

1. **删除无效的 hack**：移除 foreignObject 尺寸放大、CSS 注入等代码
2. **更新缓存版本号**：`v48-node-text`，使旧缓存失效

---

## 验证方法

1. `pnpm build` 构建项目
2. 打开包含 Mermaid 流程图的文档
3. 点击图表放大按钮打开预览窗口
4. 确认节点文字（如"主数据接口"、"资金清算"等）正确居中显示

---

## 经验总结

### 1. WebView2 与浏览器的差异

| 特性 | 浏览器 | WebView2 |
|------|--------|----------|
| foreignObject 内 HTML style 解析 | ✅ 支持 | ❌ 不支持 |
| SVG `<text>` 渲染 | ✅ 支持 | ✅ 支持 |
| CSS 作用于 foreignObject 内 HTML | ✅ 支持 | ❌ 不支持 |

### 2. 排查问题的方法论

1. **对比调试**：dev vs build，收集关键差异
2. **深入底层**：不只看"是否生效"，要看"DOM 属性值是什么"
3. **验证假设**：用 DebugPanel 输出 `computedStyle` vs `inline style`
4. **查阅规范**：了解 foreignObject 的标准行为与各引擎实现差异

### 3. 最佳实践

- **优先使用原生 SVG 元素**：`<text>`、`<rect>` 等，避免依赖 foreignObject
- **不依赖 foreignObject 内的 CSS**：在 WebView2 中不可靠
- **SVG 字符串级别修改**：比 DOM 操作更可靠，不受渲染引擎差异影响

---

## 相关文件

| 文件 | 作用 |
|------|------|
| `src/components/reader/MermaidDiagram.tsx` | Mermaid 渲染，`fixSvgColors()` 中实现转换 |
| `src/components/reader/SVGPreview.tsx` | 预览窗口，原生 text 无需 DOM 修复 |
| `src/styles/markdown.css` | foreignObject 相关 CSS（对 WebView2 节点标签无效） |

---

## 参考资料

- [SVG foreignObject MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject)
- [WebView2 Documentation](https://learn.microsoft.com/en-us/microsoft-edge/webview2/)
- [Mermaid Configuration](https://mermaid.js.org/config/configuration.html)

---

*文档创建时间: 2026-07-10*