import { useState, useEffect } from 'react';

const SHORTCUTS = [
  { category: 'Editing', keys: [
    { key: 'Click palette → click canvas', desc: 'Place a machine' },
    { key: 'Drag machine', desc: 'Move machine' },
    { key: 'Click green port → red port', desc: 'Connect with belt' },
    { key: 'Double-click belt', desc: 'Delete belt' },
    { key: 'Drag on empty canvas', desc: 'Box select machines' },
  ]},
  { category: 'Keyboard', keys: [
    { key: 'Delete / Backspace', desc: 'Remove selected machine(s) or belt' },
    { key: 'R', desc: 'Rotate selected machine' },
    { key: 'Ctrl+D', desc: 'Duplicate selected machine (with recipe + modules)' },
    { key: 'Ctrl+C', desc: 'Copy selected machine(s)' },
    { key: 'Ctrl+V', desc: 'Paste copied machine(s)' },
    { key: 'Ctrl+A', desc: 'Select all machines' },
  ]},
  { category: 'History', keys: [
    { key: 'Ctrl+Z', desc: 'Undo' },
    { key: 'Ctrl+Shift+Z / Ctrl+Y', desc: 'Redo' },
  ]},
  { category: 'Navigation', keys: [
    { key: 'Scroll', desc: 'Zoom in/out' },
    { key: 'Drag canvas', desc: 'Pan' },
    { key: 'Escape', desc: 'Cancel pending action' },
    { key: '?', desc: 'Toggle this help' },
  ]},
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
        className="max-w-2xl rounded-xl border border-factorio-border bg-factorio-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-factorio-text-bright">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShow(false)}
            className="rounded border border-factorio-border px-2 py-0.5 text-sm text-gray-400 hover:bg-factorio-border"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-factorio-accent">
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.keys.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-start gap-2 text-sm">
                    <kbd className="min-w-[100px] rounded border border-factorio-border bg-factorio-bg px-1.5 py-0.5 text-xs text-factorio-text-bright font-mono">
                      {shortcut.key}
                    </kbd>
                    <span className="text-factorio-text">{shortcut.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Press <kbd className="rounded border border-factorio-border bg-factorio-bg px-1 text-xs">?</kbd> to toggle this help
        </p>
      </div>
    </div>
  );
}