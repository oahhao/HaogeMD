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

/**
 * markdown-docx 自定义图片适配器
 * 处理相对路径图片和 data URL 图片
 * 
 * @param token - markdown-docx 的图片 token
 * @param basePath - 当前文档的基础路径（通过闭包传递）
 * @returns Promise<MarkdownImageItem | null> - 返回图片数据或 null（让库使用默认处理）
 */
export function createImageAdapter(basePath: string): (token: any) => Promise<any | null> {
  return async function customImageAdapter(token: any): Promise<any | null> {
    const src = token.href;
    const alt = token.text || '';
    const title = token.title || '';

    console.log(`图片适配器处理: src=${src}, basePath=${basePath}`);
    
    // 处理 data URL
    if (src.startsWith('data:')) {
      try {
        return await handleDataUrl(src, alt, title);
      } catch (error) {
        console.error('处理 data URL 失败:', error);
        return null;
      }
    }
    
    // 处理远程 URL（交给默认适配器）
    if (src.startsWith('http://') || src.startsWith('https://')) {
      console.log('远程 URL，使用默认适配器');
      return null;
    }
    
    // 处理本地相对路径图片
    try {
      return await handleLocalImage(src, basePath, alt, title);
    } catch (error) {
      console.error(`处理本地图片失败: ${src}`, error);
      return null;
    }
  };
}

/**
 * 处理 data URL 图片
 */
async function handleDataUrl(src: string, _alt: string, title: string): Promise<any | null> {
  try {
    // 解析 data URL
    const { type, data, mimeType } = parseDataUrl(src);
    
    // 获取图片实际尺寸
    const { width: originalWidth, height: originalHeight } = await getImageDimensions(data, mimeType);
    
    // 提取用户指定尺寸
    const userDimensions = extractUserDimensions(title);
    
    // 智能缩放尺寸
    const { width, height } = smartScaleDimensions(
      originalWidth, 
      originalHeight, 
      userDimensions.width, 
      userDimensions.height
    );
    
    console.log(`处理 data URL 图片: type=${type}, 原始尺寸=${originalWidth}x${originalHeight}, 缩放后=${width}x${height}`);
    
    // 返回 markdown-docx 期望的格式
    return {
      type,        // 'jpg' | 'png' | 'gif' | 'bmp' | 'webp'
      data,        // ArrayBuffer
      width,       // 数字（必填）
      height       // 数字（必填）
    };
    
  } catch (error) {
    console.error('处理 data URL 失败:', error);
    return null;
  }
}

/**
 * 处理本地图片
 */
async function handleLocalImage(src: string, basePath: string, alt: string, title: string): Promise<any | null> {
  try {
    // 调用 Rust 后端读取图片并转换为 data URL
    const dataUrl = await invoke<string>("read_image_as_data_url", {
      basePath,
      relativePath: src,
    });

    if (!dataUrl || !dataUrl.startsWith('data:')) {
      console.warn(`无法读取图片: ${src}`);
      return null;
    }

    // 直接使用 handleDataUrl 处理转换后的 data URL
    const result = await handleDataUrl(dataUrl, alt, title);
    
    if (result) {
      console.log(`成功处理本地图片: ${src}, 尺寸: ${result.width}x${result.height}`);
    }
    
    return result;

  } catch (error) {
    console.error(`读取本地图片失败: ${src}`, error);
    return null;
  }
}

/**
 * 转换 MIME 类型为 markdown-docx 支持的图片类型
 */
function mimeTypeToImageType(mimeType: string): 'jpg' | 'png' | 'gif' | 'bmp' | 'webp' | null {
  const mimeLower = mimeType.toLowerCase();
  
  if (mimeLower.includes('jpeg') || mimeLower.includes('jpg')) {
    return 'jpg';
  } else if (mimeLower.includes('png')) {
    return 'png';
  } else if (mimeLower.includes('gif')) {
    return 'gif';
  } else if (mimeLower.includes('bmp')) {
    return 'bmp';
  } else if (mimeLower.includes('webp')) {
    return 'webp';
  }
  
  return null;
}

/**
 * 解析 data URL
 */
function parseDataUrl(dataUrl: string): {
  type: 'jpg' | 'png' | 'gif' | 'bmp' | 'webp';
  data: ArrayBuffer;
  mimeType: string;
} {
  // 匹配 data:[mime];base64,[data] 或 data:[mime],[data]
  const match = dataUrl.match(/^data:([^;,]+)(?:;base64)?,(.+)$/);
  if (!match) {
    throw new Error(`无效的 data URL 格式: ${dataUrl.substring(0, 50)}...`);
  }
  
  const mimeType = match[1];
  const encodedData = match[2];
  
  // 获取图片类型
  const imageType = mimeTypeToImageType(mimeType);
  if (!imageType) {
    throw new Error(`不支持的图片 MIME 类型: ${mimeType}`);
  }
  
  // 解码 base64 数据
  const binaryString = atob(encodedData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return {
    type: imageType,
    data: bytes.buffer, // 转换为 ArrayBuffer
    mimeType
  };
}

/**
 * 获取图片实际尺寸
 */
async function getImageDimensions(data: ArrayBuffer, mimeType: string): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      
      URL.revokeObjectURL(url);
      
      if (width === 0 || height === 0) {
        reject(new Error('无法获取图片尺寸'));
      } else {
        resolve({ width, height });
      }
    };
    
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(new Error(`加载图片失败: ${error}`));
    };
    
    img.src = url;
  });
}

/**
 * 从 title 中提取用户指定的尺寸
 */
function extractUserDimensions(title: string): { width?: number; height?: number } {
  if (!title || !title.includes('x')) {
    return { width: undefined, height: undefined };
  }
  
  const sizeMatch = title.match(/(\d+)(?:%?)x(\d+)(?:%?)/);
  if (!sizeMatch) {
    return { width: undefined, height: undefined };
  }
  
  return {
    width: parseInt(sizeMatch[1], 10),
    height: parseInt(sizeMatch[2], 10)
  };
}

/**
 * 智能尺寸缩放算法
 * 根据 Word 页面尺寸自动缩放图片
 */
function smartScaleDimensions(
  originalWidth: number,
  originalHeight: number,
  userWidth?: number,
  userHeight?: number
): { width: number; height: number } {
  
  // 优先级 1：用户指定了完整尺寸
  if (userWidth !== undefined && userHeight !== undefined) {
    return { width: userWidth, height: userHeight };
  }
  
  // 优先级 2：用户只指定了宽度或高度，等比计算另一个
  if (userWidth !== undefined) {
    const ratio = originalHeight / originalWidth;
    return { 
      width: userWidth, 
      height: Math.max(1, Math.round(userWidth * ratio)) 
    };
  }
  
  if (userHeight !== undefined) {
    const ratio = originalWidth / originalHeight;
    return { 
      width: Math.max(1, Math.round(userHeight * ratio)), 
      height: userHeight 
    };
  }
  
  // 优先级 3：智能缩放到适合 Word 页面的尺寸
  const WORD_PAGE_MAX_WIDTH = 576;    // 7.5英寸 × 96DPI
  const WORD_PAGE_MAX_HEIGHT = 720;   // 10英寸 × 96DPI
  
  // 如果图片已经适合页面，保持原尺寸
  if (originalWidth <= WORD_PAGE_MAX_WIDTH && 
      originalHeight <= WORD_PAGE_MAX_HEIGHT) {
    return { width: originalWidth, height: originalHeight };
  }
  
  // 计算缩放比例
  const widthRatio = WORD_PAGE_MAX_WIDTH / originalWidth;
  const heightRatio = WORD_PAGE_MAX_HEIGHT / originalHeight;
  const scaleRatio = Math.min(widthRatio, heightRatio);
  
  // 应用缩放
  const scaledWidth = Math.max(1, Math.round(originalWidth * scaleRatio));
  const scaledHeight = Math.max(1, Math.round(originalHeight * scaleRatio));
  
  return { width: scaledWidth, height: scaledHeight };
}
