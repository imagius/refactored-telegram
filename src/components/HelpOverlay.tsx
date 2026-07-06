import { useState, useEffect } from 'react';

// SVG mouse diagram component
function MouseDiagram() {
  return (
    <svg viewBox="0 0 60 100" className="w-12 h-20 mx-auto" fill="none" stroke="currentColor">
      {/* Mouse body */}
      <path
        d="M15 15 Q15 5 30 5 Q45 5 45 15 L45 80 Q45 95 30 95 Q15 95 15 80 Z"
        fill="#1e2a4a"
        stroke="#3a3a5a"
        strokeWidth="1.5"
      />
      {/* Center divider */}
      <line x1="30" y1="5" x2="30" y2="40" stroke="#3a3a5a" strokeWidth="1" />
      {/* Left click area */}
      <path
        d="M15 15 Q15 5 30 5 L30 40 Q22 42 16 38 Z"
        fill="#1e2a4a"
        stroke="#3a3a5a"
        strokeWidth="1"
      />
      {/* Scroll wheel */}
      <rect x="27" y="15" width="6" height="18" rx="2" fill="#2a3a5a" stroke="#5a5a7a" strokeWidth="1" />
      {/* Labels */}
      <text x="30" y="55" fontSize="7" fill="#c4c4c4" textAnchor="middle" fontFamily="sans-serif">Left</text>
      <text x="30" y="65" fontSize="7" fill="#c4c4c4" textAnchor="middle" fontFamily="sans-serif">Click</text>
      <line x1="33" y1="20" x2="52" y2="12" stroke="#c4c4c4" strokeWidth="0.5" />
      <text x="53" y="11" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif">Wheel: Zoom</text>
      <text x="53" y="20" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif">+ Pan</text>
      <line x1="15" y1="75" x2="2" y2="82" stroke="#c4c4c4" strokeWidth="0.5" />
      <text x="0" y="90" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif" textAnchor="start">Drag:</text>
      <text x="0" y="97" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif" textAnchor="start">Box Select</text>
    </svg>
  );
}

// SVG keyboard diagram component (simplified top-row + WASD area)
function KeyboardDiagram() {
  // Helper to render a key
  const Key = ({ x, y, w, label, highlighted }: { x: number; y: number; w: number; label: string; highlighted?: boolean }) => (
    <g>
      <rect
        x={x} y={y} width={w} height={w}
        rx={3}
        fill={highlighted ? '#e94560' : '#1e2a4a'}
        stroke={highlighted ? '#ff6789' : '#3a3a5a'}
        strokeWidth="1"
      />
      <text
        x={x + w / 2} y={y + w / 2 + 3}
        fontSize="6" fill={highlighted ? '#fff' : '#c4c4c4'}
        textAnchor="middle" fontFamily="sans-serif" fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );

  const ks = 13; // key size
  const gap = 2;
  return (
    <svg viewBox="0 0 130 80" className="w-full h-auto">
      {/* Row 1: function keys area — simplified */}
      {/* Row 2: number row (just show Ctrl through R area) */}
      {/* Bottom row: Ctrl, Alt, Space, etc */}
      <Key x={0} y={0} w={ks} label="Esc" highlighted />
      <Key x={ks + gap + 5} y={0} w={ks} label="?" highlighted />

      {/* Middle row: R, D, C, V, A, Z */}
      <Key x={0} y={ks + gap + 5} w={ks} label="R" highlighted />
      <Key x={ks + gap} y={ks + gap + 5} w={ks} label="D" highlighted />
      <Key x={(ks + gap) * 2} y={ks + gap + 5} w={ks} label="C" highlighted />
      <Key x={(ks + gap) * 3} y={ks + gap + 5} w={ks} label="V" highlighted />
      <Key x={(ks + gap) * 4} y={ks + gap + 5} w={ks} label="A" highlighted />
      <Key x={(ks + gap) * 5} y={ks + gap + 5} w={ks} label="Z" highlighted />

      {/* Bottom row: Ctrl, Shift */}
      <Key x={0} y={(ks + gap + 5) * 2} w={ks * 1.5} label="⌃" highlighted />
      <text x={ks * 1.5 + 4} y={(ks + gap + 5) * 2 + ks / 2 + 3} fontSize="5" fill="#c4c4c4" fontFamily="sans-serif">Ctrl</text>
      <Key x={ks * 1.5 + gap + 8} y={(ks + gap + 5) * 2} w={ks * 1.5} label="⇧" highlighted />
      <text x={ks * 3 + gap + 12} y={(ks + gap + 5) * 2 + ks / 2 + 3} fontSize="5" fill="#c4c4c4" fontFamily="sans-serif">Shift</text>
      <Key x={ks * 3 + gap * 2 + 18} y={(ks + gap + 5) * 2} w={ks} label="Del" highlighted />

      {/* Spacebar hint */}
      <rect x={ks * 4 + gap * 3 + 18} y={(ks + gap + 5) * 2} width={ks * 2} height={ks} rx={3} fill="#1e2a4a" stroke="#3a3a5a" strokeWidth="1" />
    </svg>
  );
}

const MOUSE_SHORTCUTS = [
  { action: 'Left-click + drag on empty canvas', desc: 'Box select machines', icon: '🖱️' },
  { action: 'Left-click machine', desc: 'Select machine', icon: '🖱️' },
  { action: 'Left-click + drag machine', desc: 'Move machine', icon: '🖱️' },
  { action: 'Drag from Machine Library', desc: 'Place machine on canvas', icon: '🖱️' },
  { action: 'Click green port → red port', desc: 'Connect with belt', icon: '🔌' },
  { action: 'Double-click belt', desc: 'Delete belt', icon: '🔌' },
  { action: 'Scroll wheel', desc: 'Zoom in/out (toward cursor)', icon: '🌀' },
  { action: 'Middle-click + drag', desc: 'Pan canvas', icon: '🖐️' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Del / ⌫', desc: 'Delete selected', combo: false },
  { keys: 'R', desc: 'Rotate selected machine', combo: false },
  { keys: 'Esc', desc: 'Cancel pending action', combo: false },
  { keys: '?', desc: 'Toggle this help', combo: false },
  { keys: 'Ctrl + D', desc: 'Duplicate machine (keeps recipe + modules)', combo: true },
  { keys: 'Ctrl + C', desc: 'Copy selected machine(s)', combo: true },
  { keys: 'Ctrl + V', desc: 'Paste copied machine(s)', combo: true },
  { keys: 'Ctrl + A', desc: 'Select all machines', combo: true },
  { keys: 'Ctrl + Z', desc: 'Undo', combo: true },
  { keys: 'Ctrl + Shift + Z', desc: 'Redo', combo: true },
];

export function HelpOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === '?') {
        e.preventDefault();
        setShow((s) => !s);
      } else if (e.key === 'Escape' && show) {
        setShow(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => setShow(false)}
    >
      <div
        className="max-w-3xl rounded-xl border border-factorio-border bg-factorio-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-factorio-text-bright">Controls &amp; Shortcuts</h2>
          <button
            onClick={() => setShow(false)}
            className="rounded border border-factorio-border px-2 py-0.5 text-sm text-gray-400 hover:bg-factorio-border"
          >
            ✕
          </button>
        </div>

        {/* Mouse + Keyboard diagrams side by side */}
        <div className="mb-6 flex items-start justify-center gap-12 rounded-lg border border-factorio-border bg-factorio-bg p-4">
          {/* Mouse diagram */}
          <div className="flex flex-col items-center">
            <MouseDiagram />
            <p className="mt-1 text-xs font-semibold text-factorio-text-bright">Mouse</p>
          </div>

          {/* Divider */}
          <div className="h-24 w-px bg-factorio-border" />

          {/* Keyboard diagram */}
          <div className="flex flex-col items-center">
            <div className="w-48">
              <KeyboardDiagram />
            </div>
            <p className="mt-1 text-xs font-semibold text-factorio-text-bright">Keyboard</p>
          </div>
        </div>

        {/* Shortcuts in two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* Mouse controls */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-accent">
              🖱️ Mouse Controls
            </h3>
            <div className="space-y-2">
              {MOUSE_SHORTCUTS.map((s) => (
                <div key={s.action} className="flex items-start gap-2 text-sm">
                  <span className="text-base flex-shrink-0">{s.icon}</span>
                  <div>
                    <span className="text-factorio-text-bright font-mono text-xs">{s.action}</span>
                    <br />
                    <span className="text-factorio-text text-xs">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-accent">
              ⌨️ Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.split(' + ').map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-500 text-xs">+</span>}
                        <kbd className="min-w-[28px] text-center rounded border border-factorio-border bg-factorio-bg px-1.5 py-0.5 text-xs text-factorio-text-bright font-mono shadow-sm">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                  <span className="text-factorio-text text-xs">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          Press <kbd className="rounded border border-factorio-border bg-factorio-bg px-1.5 py-0.5 text-xs">?</kbd> any time to toggle this help
        </p>
      </div>
    </div>
  );
}