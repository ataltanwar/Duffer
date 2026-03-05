import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';

const MAX_COMMENT_LENGTH = 150;
const MAX_INDENT = 3;

export default function CommentPanel({ postId, onClose }) {
  const { profile } = useAuth();
  const notify = useNotification();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [postId]);

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!comments_user_id_fkey ( anon_username )')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch comments error:', error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    const payload = {
      post_id: postId,
      user_id: profile.id,
      content: trimmed,
      parent_id: replyTo,
    };

    const { error } = await supabase.from('comments').insert(payload);
    if (error) console.error('Comment error:', error);
    else {
      setText('');
      setReplyTo(null);
      notify('Comment posted');
    }
    setSubmitting(false);
  }

  function startReply(commentId) {
    setReplyTo(commentId);
    inputRef.current?.focus();
  }

  function cancelReply() {
    setReplyTo(null);
  }

  // Build a children map for unlimited nesting
  const childrenMap = {};
  const topLevel = [];
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
      childrenMap[c.parent_id].push(c);
    } else {
      topLevel.push(c);
    }
  });

  const replyToComment = replyTo ? comments.find((c) => c.id === replyTo) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-xl bg-surface border-t border-border rounded-t-2xl max-h-[75vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="text-sm font-medium text-white">Comments</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <p className="text-zinc-500 text-center text-sm py-6">Loading...</p>
          ) : topLevel.length === 0 ? (
            <p className="text-zinc-500 text-center text-sm py-6">No comments yet. Be the first!</p>
          ) : (
            topLevel.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                childrenMap={childrenMap}
                depth={0}
                onReply={startReply}
              />
            ))
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-border px-4 py-3 space-y-2"
        >
          {replyToComment && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Replying to <span className="text-brand-light">{replyToComment.users?.anon_username}</span></span>
              <button type="button" onClick={cancelReply} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">✕</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
              className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="bg-brand hover:bg-brand-light disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommentThread({ comment, childrenMap, depth, onReply }) {
  const indent = Math.min(depth, MAX_INDENT);
  const replies = childrenMap[comment.id] || [];

  return (
    <div style={{ marginLeft: indent > 0 ? '1.25rem' : 0 }}>
      {depth > 0 && (
        <div className="border-l-2 border-border pl-3">
          <CommentItem comment={comment} onReply={() => onReply(comment.id)} />
        </div>
      )}
      {depth === 0 && (
        <CommentItem comment={comment} onReply={() => onReply(comment.id)} />
      )}
      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          childrenMap={childrenMap}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, onReply }) {
  const timeAgo = getTimeAgo(comment.created_at);
  const username = comment.users?.anon_username ?? 'Anon';

  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-brand-light">{username}</span>
        <span className="text-xs text-zinc-600">{timeAgo}</span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">{comment.content}</p>
      <button
        onClick={onReply}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        ↳ Reply
      </button>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
