import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';

const MAX_LENGTH = 300;
const PLACEHOLDERS = [
  "What's on your mind today?",
  "Say something funny...",
  "Drop a random thought...",
  "Hot take incoming...",
  "Speak your truth anonymously...",
  "What's the vibe right now?",
  "Any tea?",
];

export default function CreatePost({ onPosted }) {
  const { profile } = useAuth();
  const notify = useNotification();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    []
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: profile.id, content: text })
      .select('id, content, created_at, user_id')
      .single();

    if (error) {
      console.error('Post error:', error);
    } else {
      setContent('');
      onPosted?.(data);
      notify('Post published');
    }
    setSubmitting(false);
  }

  const remaining = MAX_LENGTH - content.length;

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-transparent text-white placeholder-zinc-600 resize-none outline-none text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs ${remaining === 0 ? 'text-red-400' : remaining < 30 ? 'text-orange-400' : 'text-zinc-600'}`}>
          {remaining} characters remaining
        </span>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="bg-brand hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
