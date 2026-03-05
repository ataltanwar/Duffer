import { useMemo, useState, useRef, useCallback, useEffect, memo, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNotification } from '../lib/NotificationContext';
import { useConfirm } from '../lib/ConfirmContext';
import { MessageCircle } from 'lucide-react';

const EmojiPicker = lazy(() => import('./EmojiPicker'));
const CommentPanel = lazy(() => import('./CommentPanel'));

const QUICK_EMOJIS = ['😂', '💀', '🔥', '😭', '❤️'];

const PostCard = memo(function PostCard({ post, currentUserId, patchPost, removePost }) {
  const { isAdmin } = useAuth();
  const notify = useNotification();
  const confirm = useConfirm();
  const username = post.users?.anon_username ?? 'Anon';
  const timeAgo = getTimeAgo(post.created_at);
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const longPressTimer = useRef(null);
  const articleRef = useRef(null);
  const lastTapRef = useRef(0);
  const pillTapTimer = useRef(null);
  const lastPillTapRef = useRef(0);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Find current user's reaction on this post
  const myReaction = useMemo(
    () => (post.reactions || []).find((r) => r.user_id === currentUserId)?.emoji ?? null,
    [post.reactions, currentUserId]
  );

  // Group reactions by emoji with counts, sorted by popularity
  const reactionGroups = useMemo(() => {
    const groups = {};
    (post.reactions || []).forEach((r) => {
      if (!groups[r.emoji]) groups[r.emoji] = 0;
      groups[r.emoji]++;
    });
    return groups;
  }, [post.reactions]);

  const totalReactions = (post.reactions || []).length;
  const commentCount = post.comment_count ?? 0;
  const hasComments = commentCount > 0;
  const topEmojis = useMemo(
    () => Object.entries(reactionGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([emoji]) => emoji),
    [reactionGroups]
  );

  async function handleReact(emoji) {
    const postId = post.id;

    if (myReaction === emoji) {
      // Optimistic: remove reaction
      const removedReaction = post.reactions.find((r) => r.user_id === currentUserId);
      patchPost(postId, (p) => ({
        ...p,
        reactions: p.reactions.filter((r) => r.user_id !== currentUserId),
      }));
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      if (error) {
        console.error('Reaction error:', error);
        if (removedReaction) {
          patchPost(postId, (p) => ({ ...p, reactions: [...p.reactions, removedReaction] }));
        }
      }
    } else if (myReaction) {
      // Optimistic: switch emoji
      const prevEmoji = myReaction;
      patchPost(postId, (p) => ({
        ...p,
        reactions: p.reactions.map((r) =>
          r.user_id === currentUserId ? { ...r, emoji } : r
        ),
      }));
      const { error } = await supabase
        .from('reactions')
        .update({ emoji })
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      if (error) {
        console.error('Reaction error:', error);
        patchPost(postId, (p) => ({
          ...p,
          reactions: p.reactions.map((r) =>
            r.user_id === currentUserId ? { ...r, emoji: prevEmoji } : r
          ),
        }));
      }
    } else {
      // Optimistic: add new reaction
      const tempId = `temp-${Date.now()}`;
      patchPost(postId, (p) => ({
        ...p,
        reactions: [...p.reactions, { id: tempId, emoji, user_id: currentUserId }],
      }));
      const { data, error } = await supabase
        .from('reactions')
        .insert({ post_id: postId, user_id: currentUserId, emoji })
        .select('id')
        .single();
      if (error) {
        console.error('Reaction error:', error);
        patchPost(postId, (p) => ({
          ...p,
          reactions: p.reactions.filter((r) => r.id !== tempId),
        }));
      } else {
        // Replace temp id with real id
        patchPost(postId, (p) => ({
          ...p,
          reactions: p.reactions.map((r) => (r.id === tempId ? { ...r, id: data.id } : r)),
        }));
        notify('Reaction added');
      }
    }
  }

  async function handleDelete() {
    const ok = await confirm({ title: 'Delete this post?', description: 'This action cannot be undone.' });
    if (!ok) return;
    // Optimistic: remove from feed instantly
    removePost(post.id);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) console.error('Delete error:', error);
    else notify('Post deleted');
  }
  function handleQuickReact(emoji) {
    setShowQuickBar(false);
    handleReact(emoji);
  }

  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowQuickBar(true), 250);
  }, []);

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleReact('🔥');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  const handlePillTap = useCallback(() => {
    const now = Date.now();
    if (myReaction && now - lastPillTapRef.current < 300) {
      // Double tap — remove reaction
      clearTimeout(pillTapTimer.current);
      lastPillTapRef.current = 0;
      handleReact(myReaction);
    } else {
      // Single tap — open picker after delay
      lastPillTapRef.current = now;
      pillTapTimer.current = setTimeout(() => {
        setShowEmojiPicker((v) => !v);
      }, 300);
    }
  }, [myReaction]);
  async function handleBanUser() {
    const ok = await confirm({ title: 'Ban this user?', description: 'They will not be able to post.', confirmLabel: 'Ban' });
    if (!ok) return;
    const { error } = await supabase
      .from('users')
      .update({ is_banned: true })
      .eq('id', post.user_id);
    if (error) console.error('Ban error:', error);
  }

  async function handleReport() {
    setShowMenu(false);
    notify('Report submitted');
  }

  return (
    <article
      ref={articleRef}
      className="bg-surface rounded-xl border border-border p-4 space-y-3 relative select-none"
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onClick={handleDoubleTap}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Quick reaction bar on long press */}
      {showQuickBar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQuickBar(false)} />
          <div className="absolute -top-12 left-1/2 z-50 flex items-center gap-1 bg-surface border border-border rounded-full px-2 py-1.5 shadow-xl animate-pop">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickReact(emoji)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-light active:scale-110 transition-transform text-lg cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-light">{username}</span>
          <span className="text-xs text-zinc-600">{timeAgo}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-light transition-colors text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-50 min-w-[140px] bg-surface border border-border rounded-xl shadow-xl py-1 animate-menu">
              {(isAdmin || post.user_id === currentUserId) && (
                <button
                  onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-light transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setShowMenu(false); handleBanUser(); }}
                  className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-surface-light transition-colors cursor-pointer"
                >
                  Ban user
                </button>
              )}
              <button
                onClick={handleReport}
                className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-surface-light transition-colors cursor-pointer"
              >
                Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-white text-sm leading-relaxed">{post.content}</p>

      {/* Reactions & Comments */}
      <div className="flex items-center gap-3 min-h-[32px]">
        {totalReactions > 0 ? (
          <div className="relative">
            <button
              onClick={handlePillTap}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 shadow-sm transition-colors cursor-pointer ${
                myReaction
                  ? 'bg-brand/10 border border-brand/40 hover:border-brand/60'
                  : 'bg-surface-light/80 border border-border hover:border-zinc-500'
              }`}
            >
              {topEmojis.map((emoji) => (
                <span key={emoji} className={`text-sm ${emoji === myReaction ? 'scale-110' : ''}`}>{emoji}</span>
              ))}
              <span className="text-xs text-zinc-400 ml-0.5">{totalReactions}</span>
            </button>
            {showEmojiPicker && (
              <Suspense fallback={null}>
                <EmojiPicker onSelect={(emoji) => { handleReact(emoji); setShowEmojiPicker(false); }} defaultOpen onClose={() => setShowEmojiPicker(false)} activeEmoji={myReaction} />
              </Suspense>
            )}
          </div>
        ) : (
          <Suspense fallback={null}>
            <EmojiPicker onSelect={handleReact} activeEmoji={myReaction} />
          </Suspense>
        )}
        <button
          onClick={() => setShowComments(true)}
          className="inline-flex items-center gap-1 rounded-full bg-surface-light/80 border border-border px-2.5 py-1 shadow-sm hover:border-zinc-500 transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:scale-105 active:scale-100"
        >
          <MessageCircle size={16} />
          {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
        </button>
      </div>

      {/* Comment panel */}
      {showComments && (
        <Suspense fallback={null}>
          <CommentPanel postId={post.id} onClose={() => setShowComments(false)} />
        </Suspense>
      )}
    </article>
  );
});

export default PostCard;

function getTimeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
