import { useState, useEffect } from 'react';

// ===== Mouse Diagram =====
function MouseDiagram() {
  return (
    <svg viewBox="0 0 100 160" className="w-20 h-32" fill="none">
      {/* Mouse body — proper proportions, ~60w x 130h */}
      <path
        d="M20 20 Q20 5 50 5 Q80 5 80 20 L80 130 Q80 155 50 155 Q20 155 20 130 Z"
        fill="#1e2a4a"
        stroke="#5a5a7a"
        strokeWidth="2"
      />
      {/* Center divider line */}
      <line x1="50" y1="5" x2="50" y2="55" stroke="#5a5a7a" strokeWidth="1.5" />
      {/* Scroll wheel — visible 3D look */}
      <rect x="44" y="20" width="12" height="28" rx="4" fill="#3a4a6a" stroke="#6a6a8a" strokeWidth="1.5" />
      <ellipse cx="50" cy="34" rx="5" ry="12" fill="#4a5a7a" stroke="#7a7a9a" strokeWidth="0.5" />

      {/* Left click highlight */}
      <path
        d="M20 20 Q20 5 50 5 L50 55 Q35 55 25 48 Z"
        fill="#2a3a5a"
        opacity="0.5"
      />

      {/* Labels with callout lines */}
      {/* Left click */}
      <line x1="30" y1="30" x2="8" y2="30" stroke="#e94560" strokeWidth="1" />
      <circle cx="30" cy="30" r="2" fill="#e94560" />
      <text x="6" y="34" fontSize="7" fill="#e94560" textAnchor="end" fontFamily="sans-serif" fontWeight="bold">L-Click</text>
      <text x="6" y="42" fontSize="6" fill="#c4c4c4" textAnchor="end" fontFamily="sans-serif">Select / Drag</text>

      {/* Scroll wheel */}
      <line x1="56" y1="34" x2="95" y2="20" stroke="#4ade80" strokeWidth="1" />
      <circle cx="56" cy="34" r="2" fill="#4ade80" />
      <text x="97" y="18" fontSize="7" fill="#4ade80" fontFamily="sans-serif" fontWeight="bold">Wheel</text>
      <text x="97" y="26" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif">Zoom</text>

      {/* Middle click */}
      <line x1="50" y1="48" x2="95" y2="48" stroke="#facc15" strokeWidth="1" />
      <circle cx="50" cy="48" r="2" fill="#facc15" />
      <text x="97" y="52" fontSize="7" fill="#facc15" fontFamily="sans-serif" fontWeight="bold">Mid-Click</text>
      <text x="97" y="60" fontSize="6" fill="#c4c4c4" fontFamily="sans-serif">Pan</text>

      {/* Body drag */}
      <line x1="35" y1="100" x2="8" y2="110" stroke="#60a5fa" strokeWidth="1" />
      <circle cx="35" cy="100" r="2" fill="#60a5fa" />
      <text x="6" y="108" fontSize="7" fill="#60a5fa" textAnchor="end" fontFamily="sans-serif" fontWeight="bold">Drag</text>
      <text x="6" y="116" fontSize="6" fill="#c4c4c4" textAnchor="end" fontFamily="sans-serif">Box Select</text>
    </svg>
  );
}

// ===== Keyboard Diagram =====
// Renders a simplified but recognizable keyboard section with highlighted keys
function KeyboardDiagram() {
  const kw = 26; // key width
  const kh = 26; // key height
  const gap = 3;
  const o = (col: number) => col * (kw + gap); // x offset for column

  const Key = ({ x, y, label, sub, highlighted }: { x: number; y: number; label: string; sub?: string; highlighted?: boolean }) => (
    <g>
      <rect
        x={x} y={y} width={kw} height={kh}
        rx={4}
        fill={highlighted ? '#e94560' : '#1e2a4a'}
        stroke={highlighted ? '#ff6789' : '#4a4a6a'}
        strokeWidth="1.5"
      />
      <text
        x={x + kw / 2} y={y + kh / 2 - (sub ? 3 : 0)}
        fontSize="9" fill={highlighted ? '#fff' : '#c4c4c4'}
        textAnchor="middle" fontFamily="sans-serif" fontWeight="bold"
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + kw / 2} y={y + kh / 2 + 8}
          fontSize="5.5" fill={highlighted ? '#ffd0d8' : '#6a6a8a'}
          textAnchor="middle" fontFamily="sans-serif"
        >
          {sub}
        </text>
      )}
    </g>
  );

  const row1 = 0;        // y for top row
  const row2 = kh + gap;  // y for middle row
  const row3 = (kh + gap) * 2; // y for bottom row

  return (
    <svg viewBox="0 0 300 110" className="w-72 h-28">
      {/* Row 1: Esc | gap | ? */}
      <Key x={0} y={row1} label="Esc" highlighted />

      {/* Row 2: R, D, C, V, A, Z in QWERTY-ish layout */}
      <Key x={o(0)} y={row2} label="R" highlighted sub="Rotate" />
      <Key x={o(1)} y={row2} label="D" highlighted sub="Duplicate" />
      <Key x={o(2)} y={row2} label="C" highlighted sub="Copy" />
      <Key x={o(3)} y={row2} label="V" highlighted sub="Paste" />
      <Key x={o(4)} y={row2} label="A" highlighted sub="Select All" />
      <Key x={o(5)} y={row2} label="Z" highlighted sub="Undo" />
      <Key x={o(6)} y={row2} label="?" highlighted sub="Help" />

      {/* Row 3: Ctrl, Shift, Del */}
      <Key x={0} y={row3} label="Ctrl" highlighted sub="combo" />
      <Key x={o(1.3)} y={row3} label="Shift" highlighted sub="combo" />
      <Key x={o(3)} y={row3} label="Del" highlighted sub="Delete" />
      <Key x={o(4)} y={row3} label="⌫" highlighted sub="Bksp" />

      {/* Non-highlighted filler keys for context */}
      <Key x={o(5)} y={row3} label="←" />
      <Key x={o(6)} y={row3} label="↓" />
      <Key x={o(7)} y={row3} label="↑" />
      <Key x={o(8)} y={row3} label="→" />
    </svg>
  );
}

// ===== Shortcut Data =====
const MOUSE_SHORTCUTS = [
  { action: 'Left-click + drag (empty canvas)', desc: 'Box select machines', icon: '🖱️' },
  { action: 'Left-click machine', desc: 'Select machine', icon: '🖱️' },
  { action: 'Left-click + drag machine', desc: 'Move machine', icon: '🖱️' },
  { action: 'Drag from Machine Library', desc: 'Place machine on canvas', icon: '🖱️' },
  { action: 'Click green port → red port', desc: 'Connect with belt', icon: '🔌' },
  { action: 'Double-click belt', desc: 'Delete belt', icon: '🔌' },
  { action: 'Scroll wheel', desc: 'Zoom in / out (toward cursor)', icon: '🌀' },
  { action: 'Middle-click + drag', desc: 'Pan canvas', icon: '🖐️' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Del / ⌫', desc: 'Delete selected machine(s) or belt', combo: false },
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

        {/* Diagrams section — large, properly sized */}
        <div className="mb-6 flex items-center justify-center gap-16 rounded-lg border border-factorio-border bg-factorio-bg p-6">
          {/* Mouse — left side */}
          <div className="flex flex-col items-center">
            <MouseDiagram />
            <p className="mt-2 text-sm font-semibold text-factorio-text-bright">Mouse</p>
          </div>

          {/* Divider */}
          <div className="h-32 w-px bg-factorio-border" />

          {/* Keyboard — right side, larger */}
          <div className="flex flex-col items-center">
            <KeyboardDiagram />
            <p className="mt-2 text-sm font-semibold text-factorio-text-bright">Keyboard</p>
            <p className="text-xs text-gray-500">Highlighted keys = active shortcuts</p>
          </div>
        </div>

        {/* Shortcuts in two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* Mouse controls */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-accent">
              🖱️ Mouse Controls
            </h3>
            <div className="space-y-2.5">
              {MOUSE_SHORTCUTS.map((s) => (
                <div key={s.action} className="flex items-start gap-2.5 text-sm">
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
            <div className="space-y-2.5">
              {KEYBOARD_SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.split(' + ').map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-500 text-xs">+</span>}
                        <kbd className="min-w-[32px] text-center rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs text-factorio-text-bright font-mono shadow-sm">
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
          Press <kbd className="rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs">?</kbd> any time to toggle this help
        </p>
      </div>
    </div>
  );
}