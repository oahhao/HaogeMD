import React, { memo, useState } from "react";

interface DebugPanelProps {
  label: string;
  data: Record<string, unknown>;
  offsetBottom?: number;
}

const DebugPanel: React.FC<DebugPanelProps> = memo(({ label, data, offsetBottom = 10 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setExpanded(true);
        }}
        style={{
          position: 'fixed',
          bottom: `${offsetBottom}px`,
          left: '10px',
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 999999,
        }}
      >
        🐛 {label}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        bottom: `${offsetBottom}px`,
        left: '10px',
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#0f0',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        maxWidth: '600px',
        maxHeight: '500px',
        overflow: 'auto',
        zIndex: 999999,
        border: '1px solid #0f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          borderBottom: '1px solid #0f0',
          paddingBottom: '4px',
        }}
      >
        <strong style={{ color: '#ff0' }}>{label}</strong>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          style={{
            background: 'transparent',
            border: '1px solid #0f0',
            color: '#0f0',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 6px',
          }}
        >
          CLOSE
        </button>
      </div>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <div style={{ color: '#0ff', marginBottom: '2px' }}>{key}:</div>
          <pre
            style={{
              color: '#fff',
              margin: 0,
              padding: '4px',
              background: 'rgba(0, 255, 0, 0.1)',
              borderRadius: '2px',
              overflow: 'auto',
              maxWidth: '100%',
            }}
          >
            {typeof value === 'string' ? value : String(value)}
          </pre>
        </div>
      ))}
    </div>
  );
});

DebugPanel.displayName = "DebugPanel";

export default DebugPanel;
