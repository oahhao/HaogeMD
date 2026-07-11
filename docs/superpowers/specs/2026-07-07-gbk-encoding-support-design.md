# GBK 编码支持设计文档

> 创建日期：2026-07-07
> 状态：待实现

## 背景

HaogeMD 当前仅支持 UTF-8 编码的 Markdown 文件。用户打开 GBK/GB2312/Big5 等非 UTF-8 编码的文件时，会出现乱码。

### 问题分析

- **现状**：`read_file` 命令硬编码使用 UTF-8 解码（`src-tauri/src/commands/mod.rs:53`）
- **影响**：无法正确打开中文历史文档、从旧系统迁移的文档
- **需求**：自动检测文件编码，正确显示内容

## 目标

- 自动检测文件编码，支持 GBK/GB2312/Big5/Shift_JIS 等常见编码
- 对用户透明，无需手动选择编码
- 保持现有功能不变（文件树、字数统计等）
- 保存时统一使用 UTF-8 编码

## 技术方案

### 方案选择

**采用方案**：chardetng 检测 + encoding_rs 解码

**对比其他方案**：

| 方案 | 优点 | 缺点 | 结论 |
|-----|------|------|------|
| chardetng 检测 | 准确度高、体积小、维护活跃 | 需新增依赖 | ✅ 采用 |
| encoding_rs 手动检测 | 无需新依赖 | 准确度低、维护成本高 | ❌ 不采用 |
| BOM 检测 + 尝试解码 | 实现简单 | 准确度最低 | ❌ 不采用 |

### 核心变更

**修改文件**：`src-tauri/src/commands/mod.rs`

**新增依赖**：`chardetng = "0.1"`（Cargo.toml）

### 编码检测流程

```
读取文件字节
    ↓
创建 chardetng 检测器
    ↓
喂入字节流（feed）
    ↓
检测编码（guess）
    ↓
用检测到的编码解码
    ↓
返回内容 + 字数统计
```

### 保存策略

**统一保存为 UTF-8**

理由：
1. UTF-8 是 Markdown 文件的标准编码
2. HaogeMD 是"阅读器"，编辑场景较少，编码改变影响低
3. 跨平台兼容性最好
4. 实现简洁，无需缓存原编码

## 实现细节

### 1. Cargo.toml 变更

```toml
[dependencies]
# ... 现有依赖
chardetng = "0.1"
```

### 2. read_file 函数修改

```rust
use chardetng::EncodingDetector;

#[tauri::command]
pub async fn read_file(path: String) -> Result<ReadFileResult, String> {
    validate_path(&path)?;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    // 创建检测器（禁用 ISO-2022-JP，Markdown 不需要）
    let mut detector = EncodingDetector::new(chardetng::Iso2022JpDetection::Deny);
    
    // 喂入字节流
    detector.feed(&bytes, true);
    
    // 检测编码（本地文件无 TLD，允许 UTF-8）
    let encoding = detector.guess(None, chardetng::Utf8Detection::Allow);
    
    // 解码
    let (content, _, _) = encoding.decode(&bytes);
    
    let word_count = count_words(&content);
    Ok(ReadFileResult {
        content: content.into_owned(),
        word_count,
    })
}
```

### 3. write_file 保持不变

```rust
// 无需修改，继续使用 UTF-8 写入
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    validate_path(&path)?;
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}
```

## 支持的编码

| 编码类型 | 支持的编码 |
|---------|----------|
| 中文 | GBK (GB18030)、GB2312、Big5 |
| 日文 | Shift_JIS、EUC-JP |
| 韩文 | EUC-KR、ISO-2022-KR |
| 西欧 | ISO-8859-1 ~ ISO-8859-15、Windows-1252 |
| 东欧 | ISO-8859-2、Windows-1250 |
| 其他 | KOI8-R、Windows-1251 等 |

## 性能影响

- **检测开销**：线性扫描 O(n)，Markdown 文件通常 < 1MB，耗时 < 10ms
- **体积影响**：chardetng 约 40KB，项目已有 encoding_rs，无额外依赖负担
- **用户体验**：检测过程无感知

## 错误处理

- **检测失败**：chardetng 保证返回一个有效编码，默认 UTF-8
- **解码失败**：encoding_rs 自动替换无法解码的字符为 �
- **文件读取失败**：保持原有错误路径

## 测试计划

### 测试用例

| 用例 | 预期结果 |
|-----|---------|
| UTF-8 文件 | 正常显示（行为不变） |
| GBK 编码中文 Markdown | 正确解码，无乱码 |
| Big5 编码繁体中文 | 正确解码，无乱码 |
| Shift_JIS 编码日文 | 正确解码，无乱码 |
| 纯 ASCII 文件 | 正常显示 |
| 混合编码边界 | 尽可能解码，无法解码的字符显示 � |
| 编辑 GBK 文件后保存 | 保存为 UTF-8，再次打开正常 |

### 测试方法

1. 准备测试文件（多种编码的 Markdown 文件）
2. 用 `pnpm tauri dev` 启动开发模式
3. 打开测试文件，验证渲染正确性
4. 编辑并保存，验证再次打开正常

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 检测不准确 | 少数文件仍可能乱码 | chardetng 准确度高，后续可考虑手动选择编码 |
| 保存后编码改变 | 用户可能意外改变文件编码 | 未来可考虑提示用户"将保存为 UTF-8" |
| 体积增加 | 安装包略大 | chardetng 体积小，影响可忽略 |

## 后续优化

- [ ] 如用户反馈需要，可增加"重新以编码打开"功能
- [ ] 批量处理时可考虑缓存检测结果到 SQLite
- [ ] 记录用户手动纠正的编码偏好

## 参考文档

- [chardetng 文档](https://docs.rs/chardetng/latest/chardetng/)
- [encoding_rs 文档](https://docs.rs/encoding_rs/latest/encoding_rs/)
