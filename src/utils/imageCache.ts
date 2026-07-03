/**
 * 图片缓存管理器
 * 用于缓存图片的 data URL，避免重复加载
 */

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
  error?: boolean;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // 最大缓存条目数
  private maxAge = 5 * 60 * 1000; // 5分钟缓存时间（毫秒）

  /**
   * 获取缓存的图片
   */
  get(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    // 检查缓存是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * 设置缓存
   */
  set(cacheKey: string, dataUrl: string, error: boolean = false): void {
    const entry: CacheEntry = {
      dataUrl,
      timestamp: Date.now(),
      error,
    };

    this.cache.set(cacheKey, entry);

    // 如果超过最大缓存大小，移除最旧的条目
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 删除缓存
   */
  delete(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期的缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp <= this.maxAge) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * 生成缓存键
   */
  static generateKey(basePath: string, relativePath: string): string {
    if (!basePath || !relativePath) {
      throw new Error("Base path and relative path are required");
    }
    return `${basePath}:${relativePath}`;
  }

  /**
   * 生成远程图片缓存键
   */
  static generateRemoteKey(url: string): string {
    if (!url) {
      throw new Error("URL is required");
    }
    return `remote:${url}`;
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private calculateHitRate(): number {
    // 这里可以扩展为记录命中率统计
    return 0;
  }
}

// 导出单例实例
export const imageCache = new ImageCache();

// 导出类用于静态方法
export { ImageCache };