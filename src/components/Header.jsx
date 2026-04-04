import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { MessageCircle } from 'lucide-react';

export default function Header() {
  const { profile, signOut, isAdmin, updateUsername } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(profile?.anon_username || '');
    setError('');
    setEditing(true);
  }

  async function saveUsername() {
    setSaving(true);
    const { error: err } = await updateUsername(draft);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
      setError('');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveUsername();
    if (e.key === 'Escape') setEditing(false);
  }

  const location = useLocation();
  const onChat = location.pathname === '/chat';

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-border">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/home">
          <img src="/dufferlogo.svg" alt="Duffer" className="h-9" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={onChat ? '/home' : '/chat'}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
              onChat
                ? 'bg-brand/20 text-brand-light hover:bg-brand/30'
                : 'bg-surface-light text-zinc-400 hover:text-zinc-200 border border-border hover:border-zinc-500'
            }`}
          >
            <MessageCircle size={14} />
            {onChat ? 'Feed' : 'Chat'}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-xs bg-brand/20 text-brand-light px-2 py-0.5 rounded-full hover:bg-brand/30 transition-colors"
            >
              Dashboard
            </Link>
          )}
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 24))}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="bg-surface-light border border-border rounded px-2 py-1 text-sm text-white outline-none focus:border-brand w-32"
                  placeholder="Username"
                />
                {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
              </div>
              <button
                onClick={saveUsername}
                disabled={saving}
                className="text-xs text-brand-light hover:text-white transition-colors cursor-pointer"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="text-sm text-zinc-400 hover:text-brand-light transition-colors cursor-pointer"
              title="Click to change username"
            >
              {profile?.anon_username}
            </button>
          )}
          <button
            onClick={signOut}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
