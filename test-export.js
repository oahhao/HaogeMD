import { exportDocx } from "./src/utils/exportDocx";
import { generateExportHtml } from "./src/utils/generateExportHtml";

// 测试用的 Markdown 内容
const testMarkdown = `# 测试文档

这是一个测试文档，包含图片：

## 图片测试

![测试图片](<Z附件/Pasted image 20250315103411.png>)

第二张图片：
![另一张图片](Z附件/Pasted%20image%2020250315103411.png)

## 列表测试

- 项目1
- 项目2
- 项目3

## 表格测试

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

## 代码块测试

\`\`\`javascript
console.log("Hello World");
function test() {
  return 42;
}
\`\`\`

---

文档结束。`;

// 测试文件路径（基于你的文档）
const testBasePath = "/mnt/e/obisidian/life/生活/南下互认基金系统调整方案.md";

console.log("测试开始...");

// 测试 HTML 生成
console.log("测试 HTML 生成...");
try {
  const html = await generateExportHtml(testMarkdown, {}, testBasePath);
  console.log("HTML 生成成功，长度:", html.length);
  console.log("HTML 预览（前500字符）:", html.substring(0, 500));
} catch (error) {
  console.error("HTML 生成失败:", error);
}

console.log("测试完成。注意：Word导出需要用户交互（选择保存位置），所以需要在实际应用中测试。");