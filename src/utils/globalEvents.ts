/**
 * 全局事件管理器
 * 用于组件间通信，特别是错误恢复时的协调
 */

type EventType = 'reload-images' | 'clear-cache' | 'file-changed';

type EventHandler = (data?: any) => void;

class GlobalEventManager {
  private handlers = new Map<EventType, Set<EventHandler>>();

  /**
   * 订阅事件
   */
  subscribe(event: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => {
      this.unsubscribe(event, handler);
    };
  }

  /**
   * 取消订阅事件
   */
  unsubscribe(event: EventType, handler: EventHandler): void {
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.delete(handler);
    }
  }

  /**
   * 触发事件
   */
  emit(event: EventType, data?: any): void {
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 清理所有事件监听器
   */
  clear(): void {
    this.handlers.clear();
  }
}

// 导出单例实例
export const globalEvents = new GlobalEventManager();