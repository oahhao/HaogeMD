import { imageCache, ImageCache } from "@/utils/imageCache";
import { globalEvents } from "@/utils/globalEvents";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { getImageContextMenuItems } from "@/components/context-menu/ImageContextMenu";
import Portal from "@/components/Portal";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useQuickEdit } from "@/hooks/useQuickEdit";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ImageEditModal from "./ImageEditModal";

type ContextMenuImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const DEFAULT_PLACEHOLDER_HEIGHT = 200;

const ContextMenuImage: React.FC<ContextMenuImageProps> = memo((props) => {
  const { t } = useTranslation();
  const { src, alt, ...rest } = props;
  const setPreviewImage = useReaderStore((s) => s.setPreviewImage);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const [resolvedSrc, setResolvedSrc] = useState(src ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");
  const [currentAlt, setCurrentAlt] = useState("");
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();
  const { startEdit } = useQuickEdit();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // 创建 AbortController 用于取消异步操作
    const controller = new AbortController();
    const signal = controller.signal;

    const loadImage = async () => {
      // 检查是否已被取消
      if (signal.aborted) return;

      if (!src) {
        setResolvedSrc("");
        setIsLoading(false);
        setLoadError(false);
        return;
      }

      if (src.startsWith("data:")) {
        setResolvedSrc(src);
        setIsLoading(false);
        setLoadError(false);
        return;
      }

      setIsLoading(true);
      setLoadError(false);

      if (src.startsWith("http")) {
        // 检查远程图片缓存
        const cacheKey = ImageCache.generateRemoteKey(src);
        const cached = imageCache.get(cacheKey);
        
        if (cached && !cached.error) {
          // 检查是否已被取消
          if (signal.aborted) return;
          
          setResolvedSrc(cached.dataUrl);
          setIsLoading(false);
          return;
        }

        try {
          const dataUrl = await invoke<string>("fetch_remote_image_as_data_url", {
            url: src,
          });
          
          // 检查是否已被取消
          if (signal.aborted) return;
          
          // 缓存成功的加载结果
          imageCache.set(cacheKey, dataUrl);
          
          setResolvedSrc(dataUrl);
          setIsLoading(false);
        } catch (err) {
          // 检查是否已被取消
          if (signal.aborted) return;
          
          console.error("Failed to fetch remote image via backend:", err);
          
          // 缓存失败状态
          imageCache.set(cacheKey, src, true);
          
          // Fallback: try loading directly in WebView
          setResolvedSrc(src);
          setIsLoading(false);
          // handleError will be triggered by <img onError> if direct load also fails
        }
        return;
      }

      // Local relative path
      // 检查本地图片缓存
      if (!currentFilePath) {
        // 如果没有文件路径，无法加载本地图片
        setResolvedSrc(src);
        setLoadError(true);
        setIsLoading(false);
        return;
      }
      
      const cacheKey = ImageCache.generateKey(currentFilePath, src);
      const cached = imageCache.get(cacheKey);
      
      if (cached && !cached.error) {
        // 检查是否已被取消
        if (signal.aborted) return;
        
        setResolvedSrc(cached.dataUrl);
        setIsLoading(false);
        return;
      }

      try {
        const dataUrl = await invoke<string>("read_image_as_data_url", {
          basePath: currentFilePath,
          relativePath: src,
        });
        
        // 检查是否已被取消
        if (signal.aborted) return;
        
        // 缓存成功的加载结果
        imageCache.set(cacheKey, dataUrl);
        
        setResolvedSrc(dataUrl);
        setIsLoading(false);
      } catch (err) {
        // 检查是否已被取消
        if (signal.aborted) return;
        
        console.error("Failed to load local image:", err);
        
        // 缓存失败状态
        imageCache.set(cacheKey, src, true);
        
        setResolvedSrc(src);
        setLoadError(true);
        setIsLoading(false);
      }
    };

    loadImage();

    // 清理函数，取消正在进行的异步操作
    return () => {
      controller.abort();
    };
  }, [src, currentFilePath, retryCount]);

  const handleRetry = useCallback(() => {
    // 重置状态并触发重新加载
    setLoadError(false);
    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    
    // 清空 resolvedSrc 以强制重新加载
    setResolvedSrc("");
  }, []);

  // 监听全局事件，处理重新加载请求
  useEffect(() => {
    const handleReload = () => {
      console.log('ContextMenuImage: Received reload event for', src);
      // 触发重新加载
      handleRetry();
    };

    const handleClearCache = () => {
      console.log('ContextMenuImage: Clearing cache for', src);
      // 清空当前图片的缓存
      if (currentFilePath && src && !src.startsWith("http") && !src.startsWith("data:")) {
        const cacheKey = ImageCache.generateKey(currentFilePath, src);
        imageCache.delete(cacheKey);
      } else if (src && src.startsWith("http")) {
        const cacheKey = ImageCache.generateRemoteKey(src);
        imageCache.delete(cacheKey);
      }
    };

    const unsubscribeReload = globalEvents.subscribe('reload-images', handleReload);
    const unsubscribeClearCache = globalEvents.subscribe('clear-cache', handleClearCache);

    return () => {
      unsubscribeReload();
      unsubscribeClearCache();
    };
  }, [src, currentFilePath, handleRetry]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 检测图片是否在链接中，以及是否能找到包含 data-raw 的父元素
    const isInsideLink = wrapperRef.current?.closest('a') !== null;
    const hasRawParent = wrapperRef.current?.closest('[data-raw]') !== null;
    
    const items = getImageContextMenuItems(
      {
        imageUrl: resolvedSrc,
        imageAlt: alt || "",
        onCopyImage: () => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                navigator.clipboard.write([
                  new ClipboardItem({ "image/png": blob }),
                ]);
              }
            });
          };
          img.src = resolvedSrc;
        },
        onViewFullSize: () => {
          setPreviewImage(resolvedSrc);
        },
        onOpenInNewWindow: () => {
          window.open(resolvedSrc, "_blank");
        },
        onCopyImagePath: () => {
          navigator.clipboard.writeText(resolvedSrc);
        },
        onEditImage: () => {
          hideContextMenu();
          setCurrentSrc(resolvedSrc);
          setCurrentAlt(alt || "");
          setShowEditModal(true);
        },
      },
      t,
    );
    
    // 如果在链接中且有 data-raw 父元素，添加编辑整段源码选项
    if (isInsideLink && hasRawParent) {
      items.push({ id: "sep3", separator: true });
      items.push({
        id: "editBlockSource",
        label: "编辑整段源码",
        action: () => {
          hideContextMenu();
          if (wrapperRef.current) {
            startEdit(wrapperRef.current);
          }
        }
      });
    }
    
    showContextMenu(e, items);
  };

  const handleSaveImage = useCallback((newSrc: string, newAlt: string) => {
    setShowEditModal(false);
    setCurrentSrc(newSrc);
    setCurrentAlt(newAlt);
    setResolvedSrc(newSrc);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
  }, []);

  return (
    <>
      <span
        ref={wrapperRef}
        className="relative my-4"
        style={{
          display: "inline-block",
          minHeight: `${DEFAULT_PLACEHOLDER_HEIGHT}px`,
          borderRadius: "6px",
          overflow: "hidden",
        }}
        onContextMenu={handleContextMenu}
      >
        {isLoading && !loadError && (
          <span
            className="absolute inset-0"
            style={{
              display: "block",
              background:
                "linear-gradient(90deg, var(--bg-code) 25%, var(--bg-secondary) 50%, var(--bg-code) 75%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-loading 1.5s ease-in-out infinite",
            }}
          />
        )}
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4">
            <span
              className="text-center"
              style={{
                minHeight: `${DEFAULT_PLACEHOLDER_HEIGHT}px`,
                background: "var(--bg-code)",
                color: "var(--text-muted)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "8px",
                padding: "16px",
              }}
            >
              <span>{t("image.loadFailed")}</span>
              <button
                onClick={handleRetry}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                style={{
                  marginTop: "8px",
                  padding: "4px 12px",
                  background: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                重试加载
              </button>
            </span>
          </div>
        ) : (
          <img
            src={resolvedSrc}
            alt={alt || ""}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            onClick={() => setPreviewImage(resolvedSrc)}
            className="cursor-pointer"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "6px",
              margin: 0,
              opacity: isLoading ? 0 : 1,
              transition: "opacity 0.2s ease-in",
            }}
            {...rest}
          />
        )}
      </span>
      <Portal>
        {menuState && menuState.visible && (
          <ContextMenu
            menuState={menuState}
            menuRef={menuRef}
            adjustPosition={adjustPosition}
            onClose={hideContextMenu}
          />
        )}
        {showEditModal && (
          <ImageEditModal
            imageSrc={currentSrc}
            imageAlt={currentAlt}
            onSave={handleSaveImage}
            onCancel={handleCancelEdit}
          />
        )}
      </Portal>
    </>
  );
});

ContextMenuImage.displayName = "ContextMenuImage";

export default ContextMenuImage;
