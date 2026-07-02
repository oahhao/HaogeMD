import { invoke } from "@tauri-apps/api/core";

/**
 * 从 markdown 内容中提取所有图片路径（支持标准 markdown 和 Obsidian 语法）
 */
export function extractImagePaths(markdown: string): string[] {
  const imagePaths: string[] = [];

  // 标准 markdown: ![alt](<path>) 或 ![alt](path)
  const stdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = stdRegex.exec(markdown)) !== null) {
    let src = match[2].trim();

    // 处理 <path> 格式（URL 中包含空格时使用）
    if (src.startsWith("<") && src.endsWith(">")) {
      src = src.slice(1, -1);
    }

    // 跳过远程 URL 和 data URL
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      continue;
    }

    imagePaths.push(src);
  }

  // Obsidian embed: ![[filename]]
  const obsidianRegex = /!\[\[([^\]]+)\]\]/g;
  while ((match = obsidianRegex.exec(markdown)) !== null) {
    const src = match[1].trim();

    // 检查是否为图片文件
    const ext = src.split(".").pop()?.toLowerCase() || "";
    const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext);

    if (isImage && !src.startsWith("http://") && !src.startsWith("https://")) {
      imagePaths.push(src);
    }
  }

  return [...new Set(imagePaths)]; // 去重
}

/**
 * 检查 data URL 大小并返回警告信息
 */
function checkDataUrlSize(dataUrl: string, imagePath: string): { warning?: string; sizeInMB: number } {
  // data URL 格式: data:image/png;base64,iVBORw0KGgoAAAAN...
  const base64Part = dataUrl.split(',')[1] || '';
  const sizeInBytes = Math.ceil(base64Part.length * 3 / 4); // base64 近似大小计算
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > 2) {
    return {
      warning: `图片 ${imagePath} 过大 (${sizeInMB.toFixed(2)} MB)，可能导致Word导出问题`,
      sizeInMB
    };
  } else if (sizeInMB > 0.5) {
    return {
      warning: `图片 ${imagePath} 较大 (${sizeInMB.toFixed(2)} MB)，建议压缩`,
      sizeInMB
    };
  }
  
  return { sizeInMB };
}

/**
 * 解析单个图片路径为 data URL
 */
async function resolveImageToDataUrl(
  imagePath: string,
  basePath: string
): Promise<{ original: string; resolved: string; warning?: string; sizeInMB: number } | null> {
  try {
    const dataUrl = await invoke<string>("read_image_as_data_url", {
      basePath,
      relativePath: imagePath,
    });

    if (dataUrl && dataUrl.startsWith("data:")) {
      const sizeCheck = checkDataUrlSize(dataUrl, imagePath);
      return { 
        original: imagePath, 
        resolved: dataUrl,
        warning: sizeCheck.warning,
        sizeInMB: sizeCheck.sizeInMB
      };
    }
  } catch (err) {
    console.error(`Failed to resolve image: ${imagePath}`, err);
  }

  return null;
}

/**
 * 解析 markdown 中所有图片为 data URL
 * 返回替换后的 markdown 内容和图片统计信息
 */
export async function resolveAllImages(
  markdown: string,
  basePath: string
): Promise<{ content: string; warnings: string[]; totalImages: number; totalSizeMB: number }> {
  const imagePaths = extractImagePaths(markdown);
  const warnings: string[] = [];

  if (imagePaths.length === 0) {
    return { content: markdown, warnings: [], totalImages: 0, totalSizeMB: 0 };
  }

  // 并行解析所有图片
  const results = await Promise.all(
    imagePaths.map((path) => resolveImageToDataUrl(path, basePath))
  );

  // 构建替换映射
  let resolvedMarkdown = markdown;
  let totalSizeMB = 0;

  for (const result of results) {
    if (result) {
      totalSizeMB += result.sizeInMB;
      
      if (result.warning) {
        warnings.push(result.warning);
      }
      
      // 替换标准 markdown 格式: ![alt](<path>) 或 ![alt](path)
      const escapedPath = result.original
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/ /g, "\\s*");

      // 尝试匹配 <path> 格式
      const angleRegex = new RegExp(
        `!\\[([^\\]]*)\\]\\(<${escapedPath}>\\)`,
        "g"
      );
      resolvedMarkdown = resolvedMarkdown.replace(
        angleRegex,
        `![$1](${result.resolved})`
      );

      // 尝试匹配普通格式
      const normalRegex = new RegExp(
        `!\\[([^\\]]*)\\]\\(${escapedPath}\\)`,
        "g"
      );
      resolvedMarkdown = resolvedMarkdown.replace(
        normalRegex,
        `![$1](${result.resolved})`
      );

      // 替换 Obsidian 格式: ![[filename]]
      const obsidianRegex = new RegExp(
        `!\\[\\[${result.original.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}\\]\\]`,
        "g"
      );
      resolvedMarkdown = resolvedMarkdown.replace(
        obsidianRegex,
        `![](${result.resolved})`
      );
    }
  }

  return {
    content: resolvedMarkdown,
    warnings,
    totalImages: results.filter(r => r !== null).length,
    totalSizeMB: parseFloat(totalSizeMB.toFixed(2))
  };
}
