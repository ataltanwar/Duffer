import { useState, useRef, useEffect } from 'react';

const POPULAR_EMOJIS = ['😂', '🔥', '💀', '🤯', '❤️', '👀', '😭', '🙌', '💯', '🤡', '😤', '🫡', '✨', '🥶', '👏'];

export default function EmojiPicker({ onSelect, defaultOpen = false, onClose, activeEmoji = null }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      {!defaultOpen && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-light border border-border hover:border-zinc-500 transition-colors text-sm cursor-pointer"
          title="React"
        >
          +
        </button>
      )}

      {open && (
        <div className="absolute bottom-10 left-0 z-50 bg-surface border border-border rounded-xl p-2 shadow-xl grid grid-cols-5 gap-1 w-52">
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-lg cursor-pointer ${
                activeEmoji === emoji
                  ? 'bg-brand/20 ring-1 ring-brand scale-110'
                  : 'hover:bg-surface-light'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
