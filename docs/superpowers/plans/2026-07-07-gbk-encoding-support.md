# GBK 编码支持实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HaogeMD 添加自动编码检测功能，支持打开 GBK/GB2312/Big5 等非 UTF-8 编码的 Markdown 文件，保存时统一转换为 UTF-8。

**Architecture:** 在 Rust 后端的 `read_file` 命令中使用 `chardetng` 检测文件编码，然后用 `encoding_rs` 解码。前端无需修改，保存逻辑保持 UTF-8 写入不变。

**Tech Stack:** Rust, chardetng 0.1, encoding_rs 0.8.34, Tauri 2

---

## 文件结构

| 文件 | 操作 | 说明 |
|-----|------|-----|
| `src-tauri/Cargo.toml` | 修改 | 新增 `chardetng = "0.1"` 依赖 |
| `src-tauri/src/commands/mod.rs` | 修改 | 重写 `read_file` 函数，添加编码检测逻辑 |
| `docs/superpowers/specs/2026-07-07-gbk-encoding-support-design.md` | 参考 | 设计文档 |

---

### Task 1: 添加 chardetng 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: 添加依赖到 Cargo.toml**

在 `[dependencies]` 部分添加：

```toml
chardetng = "0.1"
```

- [ ] **Step 2: 验证依赖可用**

Run: `cd src-tauri && cargo check`
Expected: 无错误，依赖下载成功

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "feat(encoding): add chardetng dependency for auto encoding detection"
```

---

### Task 2: 重写 read_file 函数

**Files:**
- Modify: `src-tauri/src/commands/mod.rs:50-59`

- [ ] **Step 1: 添加 chardetng import**

在文件顶部添加：

```rust
use chardetng::EncodingDetector;
```

- [ ] **Step 2: 修改 read_file 函数**

将现有 `read_file` 函数替换为：

```rust
#[tauri::command]
pub async fn read_file(path: String) -> Result<ReadFileResult, String> {
    validate_path(&path)?;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    // 创建编码检测器（禁用 ISO-2022-JP，Markdown 不需要）
    let mut detector = EncodingDetector::new(chardetng::Iso2022JpDetection::Deny);
    
    // 喂入字节流
    detector.feed(&bytes, true);
    
    // 检测编码（本地文件无 TLD，允许 UTF-8）
    let encoding = detector.guess(None, chardetng::Utf8Detection::Allow);
    
    // 用检测到的编码解码
    let (content, _, _) = encoding.decode(&bytes);
    
    let word_count = count_words(&content);
    Ok(ReadFileResult {
        content: content.into_owned(),
        word_count,
    })
}
```

- [ ] **Step 3: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: 无错误，编译通过

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "feat(encoding): auto detect file encoding in read_file command"
```

---

### Task 3: 验证功能

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1: 启动开发模式**

Run: `pnpm tauri dev`
Expected: 应用正常启动

- [ ] **Step 2: 测试 UTF-8 文件**

打开任意 UTF-8 编码的 Markdown 文件，验证：
- 内容正确显示
- 无乱码
- 行为与之前一致

- [ ] **Step 3: 测试 GBK 编码文件**

准备一个 GBK 编码的中文 Markdown 测试文件（可从历史文档获取或手动创建），验证：
- 打开后内容正确显示
- 中文无乱码

- [ ] **Step 4: 测试保存行为**

编辑 GBK 文件，保存后：
- 用外部工具检查文件编码是否变为 UTF-8
- 再次用 HaogeMD 打开，验证内容正确

- [ ] **Step 5: 最终 Commit（如有遗漏）**

```bash
git status
# 如有未提交文件，补充提交
```

---

## 测试验收标准

| 场景 | 验收标准 |
|-----|---------|
| UTF-8 文件 | 正常显示，行为不变 |
| GBK 文件 | 正确解码，无乱码 |
| 保存后重新打开 | 内容正确，编码为 UTF-8 |
| 纯 ASCII 文件 | 正常显示 |

---

## 注意事项

1. **无需修改前端**：前端调用 `read_file` 的逻辑不变，返回值类型不变
2. **无需修改 write_file**：保存继续使用 UTF-8，这是设计决策
3. **体积影响**：chardetng 约 40KB，影响可忽略
4. **向后兼容**：UTF-8 文件行为完全不变

---

## 参考文档

- 设计文档：`docs/superpowers/specs/2026-07-07-gbk-encoding-support-design.md`
- chardetng API：https://docs.rs/chardetng/latest/chardetng/struct.EncodingDetector.html