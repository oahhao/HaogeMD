import { globalEvents } from "@/utils/globalEvents";
import React, { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void; // 添加重试回调
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorTimestamp: number; // 记录错误时间
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { 
    hasError: false, 
    error: null,
    errorTimestamp: 0
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorTimestamp: Date.now()
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
    
    // 记录详细的错误信息
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error("[ErrorBoundary] Details:", JSON.stringify(errorDetails, null, 2));
  }

  handleReload = () => {
    // 触发全局事件，通知所有组件重新加载
    globalEvents.emit('reload-images');
    globalEvents.emit('clear-cache');
    
    // 先调用父组件的重试回调（如果有）
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    
    // 重置状态
    this.setState({ 
      hasError: false, 
      error: null,
      errorTimestamp: 0 
    });
    
    // 尝试清理图片缓存
    this.clearImageCache();
  };

  // 清理图片缓存
  clearImageCache = () => {
    try {
      // 如果有全局的图片缓存实例，清理它
      if (typeof window !== 'undefined' && (window as any).imageCache) {
        (window as any).imageCache.clear();
      }
      
      // 强制所有图片重新加载
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('data:')) {
          // 移除data URL图片，强制重新加载
          img.removeAttribute('src');
          setTimeout(() => {
            img.setAttribute('src', src);
          }, 100);
        }
      });
    } catch (error) {
      console.warn("[ErrorBoundary] Failed to clear image cache:", error);
    }
  };

  // 检查是否应该显示错误
  shouldShowError(error: Error): boolean {
    // 过滤掉一些已知的不需要显示的错误
    const ignoredErrors = [
      "Cannot read 'clipboard'",
      "ResizeObserver loop limit exceeded",
      "Hydration failed"
    ];
    
    return !ignoredErrors.some(ignored => error.message.includes(ignored));
  }

  render() {
    if (this.state.hasError && this.state.error && this.shouldShowError(this.state.error)) {
      const error = this.state.error;
      const isHydrationError = error.message.includes("Hydration failed");
      const isClipboardError = error.message.includes("Cannot read 'clipboard'");
      
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "2rem",
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            color: "var(--text-primary, #e0e0e0)",
            background: "var(--bg-primary, #1a1a2e)",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "0.75rem",
              color: "var(--text-primary, #e0e0e0)",
            }}
          >
            {isHydrationError ? "渲染错误" : "出了点问题"}
          </h2>
          
          {isClipboardError && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              background: "var(--bg-secondary, #252540)",
              borderRadius: "6px",
              fontSize: "0.875rem",
              color: "var(--text-secondary, #a0a0a0)",
              maxWidth: "400px",
            }}>
              剪贴板权限问题：请检查浏览器剪贴板设置或尝试重新授权
            </div>
          )}
          
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary, #a0a0a0)",
              marginBottom: "1.5rem",
              textAlign: "center",
              maxWidth: "400px",
              fontFamily: "monospace",
              backgroundColor: "rgba(0,0,0,0.3)",
              padding: "0.5rem",
              borderRadius: "4px",
              wordBreak: "break-word",
            }}
          >
            {isHydrationError 
              ? "页面渲染不一致，请重试加载" 
              : error.message || "发生了未知错误"}
          </p>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #333)",
                background: "var(--color-primary, #007bff)",
                color: "white",
                cursor: "pointer",
              }}
            >
              重试
            </button>
            
            {isClipboardError && (
              <button
                onClick={() => {
                  // 忽略剪贴板错误，继续使用
                  this.handleReload();
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  fontSize: "0.875rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color, #333)",
                  background: "var(--bg-secondary, #252540)",
                  color: "var(--text-primary, #e0e0e0)",
                  cursor: "pointer",
                }}
              >
                忽略剪贴板错误
              </button>
            )}
          </div>
          
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted, #666)",
              marginTop: "1.5rem",
              textAlign: "center",
            }}
          >
            错误时间: {new Date(this.state.errorTimestamp).toLocaleString()}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
