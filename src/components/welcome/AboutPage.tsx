import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { forceCheckUpdate } from "../common/UpdateChecker";
import { useReaderStore } from "../../stores/readerStore";
import AppIcon from "./AppIcon";

// 静态资源路径

interface AboutPageProps {
  onClose: () => void;
}

const AboutPage: React.FC<AboutPageProps> = memo(({ onClose }) => {
  const { t } = useTranslation();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [latestAvailable, setLatestAvailable] = useState<{
    version: string;
    downloadUrl: string;
    releaseUrl: string;
  } | null>(null);
  const addToast = useReaderStore((s) => s.addToast);

  // AboutPage 打开时自动检测一次，绕过 24h 缓存，拿到最新版本徽章数据
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await forceCheckUpdate();
        if (cancelled) return;
        if (result.hasUpdate && result.releaseUrl) {
          setLatestAvailable({
            version: result.latestVersion,
            downloadUrl: result.downloadUrl,
            releaseUrl: result.releaseUrl,
          });
        }
      } catch {
        // 静默失败，不打扰用户
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVersionClick = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const { hasUpdate, latestVersion, releaseUrl } =
        await forceCheckUpdate();
      if (hasUpdate) {
        if (releaseUrl) {
          setLatestAvailable({
            version: latestVersion,
            downloadUrl: releaseUrl,
            releaseUrl: releaseUrl,
          });
        }
        addToast({
          type: "info",
          message: t("about.newVersionAvailable", { version: latestVersion }),
          duration: 8000,
          action: { label: t("about.viewRelease"), url: releaseUrl },
        });
      } else {
        setLatestAvailable(null);
        addToast({
          type: "info",
          message: t("about.noUpdate", { version: latestVersion }),
          duration: 3000,
        });
      }
    } catch {
      addToast({
        type: "error",
        message: t("about.updateCheckFailed"),
        duration: 3000,
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <>
      {/* 背景遮罩 — 支持拖拽窗口 */}
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--overlay-bg, rgba(0,0,0,0.6))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* 卡片 */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          maxWidth: "680px",
          width: "90%",
          maxHeight: "85vh",
          background: "var(--bg-secondary, #1e1e1e)",
          border: "1px solid var(--divider)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-popup)",
          overflowY: "auto",
          color: "var(--text-primary, #e0e0e0)",
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          title="按 Esc 可关闭"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "18px",
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
            borderRadius: "4px",
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--toast-error-border)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          ✕
        </button>

        <div style={{ padding: "24px 24px 16px" }}>
          {/* ===== 上部：图标 + 名称 + 版本 + 描述 + slogan ===== */}
          <div
            className="flex items-start gap-4"
            style={{ marginBottom: "12px" }}
          >
            <AppIcon
              size={120}
              style={{ flexShrink: 0, borderRadius: "12px" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: "6px" }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  HaogeMD
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "var(--hover-bg)",
                    color: "var(--accent-cyan)",
                    border: "1px solid var(--active-border)",
                    flexShrink: 0,
                    transition: "opacity 0.2s",
                  }}
                >
                  v{packageJson.version}
                </span>
                <button
                  onClick={handleVersionClick}
                  disabled={checkingUpdate}
                  title={t("about.checkUpdateHint")}
                  className="flex items-center justify-center"
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "transparent",
                    border: "1px solid var(--active-border)",
                    color: "var(--accent-cyan)",
                    cursor: checkingUpdate ? "wait" : "pointer",
                    opacity: checkingUpdate ? 0.5 : 1,
                    flexShrink: 0,
                    padding: 0,
                    fontSize: "12px",
                    lineHeight: 1,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!checkingUpdate) {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  {checkingUpdate ? "…" : "↻"}
                </button>
                {latestAvailable && (
                  <button
                    onClick={() => openUrl(latestAvailable.releaseUrl)}
                    title={t("about.latestVersionHint", {
                      version: latestAvailable.version,
                    })}
                    className="flex items-center gap-1"
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: "var(--hover-bg)",
                      color: "var(--accent-green, #00FF64)",
                      border: "1px solid var(--accent-green, #00FF64)",
                      flexShrink: 0,
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "0.7";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                    }}
                  >
                    <span aria-hidden="true">↑</span>
                    <span>v{latestAvailable.version}</span>
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "var(--text-secondary)",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {t("about.appDescription")}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                  margin: "6px 0 0 0",
                  opacity: 0.6,
                }}
              >
                — {t("about.slogan")}
              </p>
            </div>
          </div>

          {/* ===== 特性标签 ===== */}
          <div
            className="flex flex-wrap justify-center gap-2"
            style={{ marginBottom: "14px" }}
          >
            {[
              { icon: "📖", label: t("about.feature1") },
              { icon: "🎨", label: t("about.feature2") },
              { icon: "⚡", label: t("about.feature3") },
              { icon: "🔍", label: t("about.feature4") },
              { icon: "📤", label: t("about.feature5") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1"
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--bg-tertiary, rgba(255,255,255,0.02))",
                  border:
                    "1px solid var(--border-subtle, rgba(255,255,255,0.04))",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* ===== 分隔线 ===== */}
          <div
            style={{
              height: "1px",
              background: "var(--divider)",
              margin: "0 0 14px 0",
            }}
          />

          {/* ===== 底部 ===== */}

          {/* ===== 底部 ===== */}
          <div
            style={{
              borderTop: "1px solid var(--divider)",
              marginTop: "16px",
              paddingTop: "12px",
              textAlign: "center",
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <a
              href="https://github.com/oahhao/HaogeMD"
              onClick={(e) => {
                e.preventDefault();
                openUrl("https://github.com/oahhao/HaogeMD");
              }}
              className="flex items-center justify-center gap-2"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--divider)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = "var(--hover-bg)";
                target.style.borderColor = "var(--accent-cyan)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = "transparent";
                target.style.borderColor = "var(--divider)";
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: "14px", height: "14px" }}
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>{t("about.githubStar")}</span>
            </a>
            <span style={{ opacity: 0.4 }}>|</span>
            {t("about.footer")}
          </div>
        </div>
      </div>
    </>
  );
});

AboutPage.displayName = "AboutPage";

export default AboutPage;
