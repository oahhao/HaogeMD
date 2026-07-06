# ErgeMD → HaogeMD 二次开发计划

> 创建日期：2026-06-26
> 基线版本：v0.4.1
> 品牌：HaogeMD（原 ErgeMD 二次开发）
> 作者：豪哥 (haogemd@163.com)
> 开发策略：边用边修 → 增量迭代

---

## 一、项目定位

基于 ErgeMD v0.4.1 进行二次开发，目标：

1. **修复使用过程中的问题**：在个人知识库和代码文档阅读场景中发现的 bug 和体验问题
2. **增加轻量编辑能力**：从纯阅读器扩展为"阅读为主、编辑为辅"的轻量 Markdown 工具
3. **公开发布**：品牌定制后作为独立产品发布

---

## 二、代码基线

| 维度 | 现状 |
|------|------|
| 版本 | v0.4.1 |
| 许可证 | AGPL-3.0 |
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind 4 + Zustand 5 |
| 后端 | Tauri 2 + Rust (edition 2021) + SQLite (sqlx) |
| 前端代码量 | ~8000 行 TS/TSX |
| 后端代码量 | ~1500 行 Rust |
| 核心模块 | markdownBlocks.ts(1010行)、MarkdownBlockView.tsx(710行)、App.tsx(818行) |

### 关键架构决策（不可违背）

- 前后端严格分离：Rust 处理所有 IO，前端专注 UI
- Zustand 选择器订阅，禁止订阅整个 store
- React.memo 包裹所有子组件
- 动画只使用 transform 和 opacity
- 虚拟滚动处理长文档

---

## 三、开发阶段

### Phase 1：修复与优化（边用边修）

在实际使用中发现问题，即时修复。重点关注以下已知问题：

#### 1.1 性能相关

| 编号 | 问题 | 严重度 | 状态 |
|------|------|--------|------|
| P-01 | 大文件(>50k行)分块解析仍有卡顿 | 中 | 待验证 |
| P-02 | 主题切换时 Mermaid/PlantUML 图表需重新渲染 | 低 | 待优化 |
| P-03 | 多窗口间主题/设置同步有延迟 | 中 | 待修复 |

#### 1.2 功能相关

| 编号 | 问题 | 严重度 | 状态 |
|------|------|--------|------|
| F-01 | 浮动目录在复杂嵌套文档中定位不准 | 中 | 待验证 |
| F-02 | 远程图片代理 fallback 路径不稳定 | 低 | 待验证 |
| F-03 | 文件编码检测覆盖不全（缺 GB18030/Big5） | 低 | 待扩展 |
| F-04 | PDF 导出不支持水印 | 低 | TODO |
| F-05 | QuickEdit 对复杂块级元素（表格、嵌套列表）支持不完善 | 中 | 待增强 |
| F-06 | 双击打开 .md 文件只显示上次文件，新文件不打开 | P0 | ✅ 已修复 (2026-06-26) |

#### 1.3 体验相关

| 编号 | 问题 | 严重度 | 状态 |
|------|------|--------|------|
| U-01 | 首次启动加载慢（需编译 Rust） | 低 | 待优化 |
| U-02 | 搜索功能不支持正则表达式 | 低 | 待扩展 |
| U-03 | 文件树不支持自定义排序 | 低 | 待扩展 |
| U-04 | 缺少最近关闭的标签页恢复功能 | 低 | 待新增 |
| U-05 | ConfigLevelSelector 图层重叠+生产构建样式丢失 | P1 | ✅ 已修复 (2026-06-30) |
| U-06 | Markdown 链接点击无法打开文件（导航到空白页） | P1 | ✅ 已修复 (2026-06-30) |

### Phase 2：轻量编辑能力

在现有 QuickEdit 基础上扩展为所见即所得编辑模式。

#### 2.0 QuickEdit 增强（已完成 ✅ 2026-07-03）

将 QuickEdit 的 textarea 替换为 CodeMirror 6 编辑器，提升编辑体验。

**已完成功能：**
- [x] 安装 CodeMirror 6 核心依赖（@codemirror/state, view, lang-markdown, language-data, commands, language）
- [x] 创建 EditorCore 组件封装 CodeMirror 6
- [x] 实现 Markdown 语法高亮扩展
- [x] 创建 QuickEditToolbar 组件（基础工具按钮）
- [x] 改造 QuickEdit 组件集成 CodeMirror
- [x] 实现快捷键插入功能（Ctrl+B/I/S/`/1-6/K）
- [x] 编辑器主题适配（继承应用主题变量）

#### 2.0.1 代码块编辑增强（已完成 ✅ 2026-07-03）

增强 CodeBlock 组件，支持双击/右键菜单触发编辑，编辑后保存到源文件。

**已完成功能：**
- [x] 修复右键菜单显示问题（App.tsx handleReaderContextMenu 添加代码块排除）
- [x] 添加双击代码块触发编辑（CodeBlock.tsx onDoubleClick）
- [x] 创建 BlockContext 传递 block 信息（src/contexts/BlockContext.tsx）
- [x] 实现保存到源文件功能（replaceLinesByRange + write_file）
- [x] 替换 textarea 为 CodeMirror 编辑器（EditorCore 组件）
- [x] 动态语言高亮（codeHighlight.ts + 14种语言包）

**触发方式：**
- 双击代码块区域
- 右键菜单 → "编辑代码块"

**新增文件：**
- `src/contexts/BlockContext.tsx` - Block Context
- `src/components/editor/EditorCore.tsx` - CodeMirror 封装组件
- `src/components/editor/extensions.ts` - 编辑器扩展配置
- `src/components/editor/theme.ts` - 编辑器主题样式
- `src/components/editor/keymap.ts` - 快捷键映射
- `src/components/editor/codeHighlight.ts` - 动态语言高亮
- `src/components/reader/QuickEditToolbar.tsx` - 工具栏组件
- `src/utils/markdownInsert.ts` - Markdown 插入工具函数

**新增依赖：**
- @codemirror/lang-javascript, python, java, cpp, rust, sql, json, xml, html, css, lezer, php, sass, wast（14个语言包）

**依赖增量：约 260KB gzip**

#### 2.1 编辑/阅读模式切换（待实现）

- 工具栏增加编辑模式切换按钮
- 编辑模式下显示 Markdown 源码
- 支持分屏预览（左编辑右预览）和纯源码两种模式
- 快捷键 `Ctrl+E` 在阅读/编辑间切换（现有导出 HTML 快捷键需调整）

#### 2.2 编辑工具栏（部分完成）

- [x] 加粗、斜体、删除线、行内代码
- [x] 标题（H1-H3）
- [x] 链接、图片插入
- [x] 代码块、引用块
- [x] 无序列表、有序列表
- [ ] 任务列表
- [ ] 表格插入助手

#### 2.3 编辑增强（部分完成）

- [ ] 自动保存（可配置间隔，默认 30s）
- [x] 撤销/重做（CodeMirror 内置）
- [x] 语法高亮（编辑器中 Markdown 语法着色）
- [ ] 自动补全（链接路径、图片路径）
- [ ] 查找替换（支持正则）

#### 2.4 技术方案

```
编辑模式架构：
┌─────────────────────────────────────┐
│  Toolbar（编辑工具栏）               │
├──────────────────┬──────────────────┤
│  Editor Panel    │  Preview Panel   │
│  (CodeMirror 6)  │  (MarkdownView)  │
│  - 语法高亮      │  - 实时渲染      │
│  - 自动补全      │  - 滚动同步      │
│  - 撤销/重做     │                  │
└──────────────────┴──────────────────┘
```

- 编辑器选型：CodeMirror 6（轻量、可扩展、Markdown 支持好）
- 预览复用现有 MarkdownBlockView 组件
- 滚动同步：编辑区和预览区双向滚动联动

### Phase 3：公开发布准备

#### 3.1 品牌定制 ✅ 已完成 (2026-06-26)

- [x] 应用名称定制（ErgeMD → HaogeMD）
- [x] 作者信息替换（宝藏二哥AIA → 豪哥）
- [x] 关于页信息更新
- [x] 窗口标题定制
- [x] i18n 国际化更新
- [x] localStorage key 更新
- [x] 图片文件重命名
- [x] 应用图标替换（待设计）

#### 3.2 发布准备

- 配置自动更新（GitHub Release）
- 代码签名（Windows）
- 安装包优化（减小体积）
- 多语言完善

#### 3.3 文档

- 用户使用手册
- 开发者文档
- CHANGELOG 维护

---

## 四、实施策略

### 边用边修模式

1. **日常使用 ErgeMD 阅读个人知识库和代码文档**
2. **发现问题立即记录到本文档对应条目**
3. **评估优先级后修复**
4. **修复后验证并标记完成**

### 优先级定义

| 级别 | 定义 | 响应时间 |
|------|------|----------|
| P0 | 阻断性 bug，无法正常使用 | 立即修复 |
| P1 | 严重影响体验 | 当天修复 |
| P2 | 一般问题 | 本周修复 |
| P3 | 锦上添花 | 排期修复 |

### 开发流程

```
发现问题 → 记录到 dev-plan.md → 评估优先级 → 创建分支 → 修复 → 验证 → 合并
```

---

## 五、技术约束

### 必须遵守

- 前后端分离：所有 IO 走 Rust 后端
- Zustand 选择器订阅
- React.memo 包裹子组件
- 动画只用 transform/opacity
- 虚拟滚动处理长文档

### 禁止操作

- 禁止引入 Redux/MobX
- 禁止引入 CSS-in-JS
- 禁止引入重型 UI 组件库（Ant Design/MUI）
- 禁止前端直接操作文件系统
- 禁止修改构建配置文件（除非明确需要）

### 新增依赖审批

引入新依赖前需评估：
- 包体积影响
- 与现有技术栈的兼容性
- 是否有更轻量的替代方案

---

## 六、文件结构规划

二次开发新增/修改的文件：

```
ErgeMD/
├── docs/
│   └── dev-plan.md              # 本文件
├── src/
│   ├── components/
│   │   └── editor/              # [新增] 编辑器组件
│   │       ├── EditorPanel.tsx   # 编辑面板
│   │       ├── EditorToolbar.tsx # 编辑工具栏
│   │       └── SplitView.tsx    # 分屏视图
│   ├── hooks/
│   │   └── useEditor.ts         # [新增] 编辑器状态管理
│   └── stores/
│       └── editorStore.ts       # [新增] 编辑器 store
└── src-tauri/
    └── src/
        └── commands/
            └── mod.rs           # [修改] 新增编辑相关命令
```

---

## 七、版本规划

| 版本 | 内容 | 预计时间 |
|------|------|----------|
| v0.5.0 | Phase 1 修复 + 问题收敛 | 边用边修，持续 |
| v0.6.0 | Phase 2 轻量编辑 MVP | 2-3 周 |
| v0.7.0 | Phase 2 编辑增强 | 1-2 周 |
| v1.0.0 | Phase 3 品牌定制（✅ 已完成）+ 公开发布 | 1 周 |

---

*最后更新：2026-07-03（为 CodeBlock 添加稳定 key + 彻底移除条件渲染）*
