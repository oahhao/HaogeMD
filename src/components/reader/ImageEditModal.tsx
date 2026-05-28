import React, { memo, useCallback, useEffect, useState } from "react";

interface ImageEditModalProps {
  imageSrc: string;
  imageAlt: string;
  onSave: (src: string, alt: string) => void;
  onCancel: () => void;
}

const ImageEditModal: React.FC<ImageEditModalProps> = memo(
  ({ imageSrc, imageAlt, onSave, onCancel }) => {
    const [src, setSrc] = useState(imageSrc);
    const [alt, setAlt] = useState(imageAlt);
    const [saveBtnHovered, setSaveBtnHovered] = useState(false);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    const handleSave = useCallback(() => {
      onSave(src, alt);
    }, [src, alt, onSave]);

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      },
      [onCancel],
    );

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease-out",
          padding: "24px",
        }}
        onClick={handleOverlayClick}
      >
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--divider)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            animation: "slideUp 0.25s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              background:
                "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
              borderBottom: "1px solid var(--divider)",
              padding: "12px 24px",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-cyan)", opacity: 0.9 }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--text-primary)" }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3
                className="text-base font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                编辑图片
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5"
              style={{
                color: "var(--text-secondary)",
                background: "transparent",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="space-y-6" style={{ padding: "16px 24px" }}>
            {/* Image URL */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                图片地址
              </label>
              <input
                type="text"
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                className="w-full px-4 py-3.5 rounded-sm border transition-all duration-200 focus:outline-none link-edit-input"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--divider)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
                placeholder="输入图片地址"
                autoFocus
              />
            </div>

            {/* Image Alt */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                替代文本
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="w-full px-4 py-3.5 rounded-sm border transition-all duration-200 focus:outline-none link-edit-input"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--divider)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
                placeholder="输入图片替代文本（可选）"
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-4"
            style={{
              background: "var(--bg-primary)",
              borderTop: "1px solid var(--divider)",
              padding: "12px 24px",
            }}
          >
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-medium rounded-sm transition-all duration-200"
              style={{
                color: "var(--text-secondary)",
                background: "transparent",
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="text-sm font-medium rounded-sm transition-all duration-200"
              style={{
                color: "var(--bg-page, #000)",
                background:
                  "linear-gradient(135deg, var(--accent-cyan) 0%, #80ffff 100%)",
                boxShadow: saveBtnHovered
                  ? "0 4px 12px rgba(0, 255, 255, 0.4)"
                  : "0 2px 8px rgba(0, 255, 255, 0.3)",
                transform: saveBtnHovered
                  ? "translateY(-1px)"
                  : "translateY(0)",
                padding: "4px 10px",
              }}
              onMouseEnter={() => setSaveBtnHovered(true)}
              onMouseLeave={() => setSaveBtnHovered(false)}
            >
              保存
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .link-edit-input:focus {
            border-color: var(--accent-cyan) !important;
            box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.1) !important;
          }
        `}</style>
      </div>
    );
  },
);

ImageEditModal.displayName = "ImageEditModal";

export default ImageEditModal;
