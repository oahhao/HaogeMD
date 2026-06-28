/**
 * 字数统计工具
 * 支持 CJK（中日韩）字符和英文单词的混合统计
 */

/**
 * 统计文本字数
 * - CJK 字符：每个字符算一个字
 * - 英文单词：按空格分词统计
 * - 数字：按连续数字算一个词
 */
export function countWords(text: string): number {
  if (!text) return 0;

  let count = 0;

  // 统计 CJK 字符数
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g;
  const cjkMatches = text.match(cjkRegex);
  if (cjkMatches) {
    count += cjkMatches.length;
  }

  // 移除 CJK 字符后统计英文单词
  const nonCjkText = text.replace(cjkRegex, " ");
  // 匹配连续的字母/数字组合
  const wordRegex = /[a-zA-Z0-9]+/g;
  const wordMatches = nonCjkText.match(wordRegex);
  if (wordMatches) {
    count += wordMatches.length;
  }

  return count;
}
