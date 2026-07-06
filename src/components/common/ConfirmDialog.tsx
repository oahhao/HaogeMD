import { memo } from "react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}

const ConfirmDialog = memo(
  ({ message, onConfirm, onCancel, visible }: ConfirmDialogProps) => {
    if (!visible) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onCancel}
      >
        <div
          style={{
            background: "var(--bg-secondary, #1A1A2A)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "360px",
            boxShadow: "0 8px 32px var(--shadow-popup)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              color: "var(--text-primary)",
              fontSize: "14px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {message}
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={onCancel}
              style={{
                padding: "8px 20px",
                background: "var(--hover-bg-subtle)",
                color: "var(--text-secondary)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: "8px 20px",
                background: "var(--accent-cyan, #00FFFF)",
                color: "var(--bg-page, #0A0A0F)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              确定
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ConfirmDialog.displayName = "ConfirmDialog";

export default ConfirmDialog;