import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import Header from '../components/Header';

const FEED_LIMIT = 30;
const PAGE_SIZE = 20;
const HEALTH_CHECK_INTERVAL = 30_000;
const SOFT_REFRESH_INTERVAL = 2 * 60_000;

export default function FeedPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef(null);
  const healthRef = useRef(null);
  const softRefreshRef = useRef(null);
  const sentinelRef = useRef(null);
  const currentUserId = profile?.id;

  // ── Fetch only required fields, limited to PAGE_SIZE ──
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id,
        users!posts_user_id_fkey ( anon_username ),
        reactions ( id, emoji, user_id ),
        comments ( count )
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Fetch posts error:', error);
      return;
    }

    const postsWithCounts = (data || []).map((p) => ({
      ...p,
      comment_count: p.comments?.[0]?.count ?? 0,
    }));

    setPosts(postsWithCounts);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
  }, []);

  // ── Load more (infinite scroll) ──
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const oldest = posts[posts.length - 1]?.created_at;
    if (!oldest) { setLoadingMore(false); return; }

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id,
        users!posts_user_id_fkey ( anon_username ),
        reactions ( id, emoji, user_id ),
        comments ( count )
      `)
      .order('created_at', { ascending: false })
      .lt('created_at', oldest)
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Load more error:', error);
      setLoadingMore(false);
      return;
    }

    const more = (data || []).map((p) => ({
      ...p,
      comment_count: p.comments?.[0]?.count ?? 0,
    }));

    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const unique = more.filter((p) => !existingIds.has(p.id));
      return [...prev, ...unique];
    });
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts]);

  // ── Granular state updaters (no full refetch) ──
  // Skip events from current user — those are already handled optimistically
  const handlePostInsert = useCallback((payload) => {
    const newPost = payload.new;
    if (newPost.user_id === currentUserId) return; // already optimistic
    supabase
      .from('users')
      .select('anon_username')
      .eq('id', newPost.user_id)
      .single()
      .then(({ data }) => {
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          return [
            {
              ...newPost,
              users: { anon_username: data?.anon_username ?? 'Anon' },
              reactions: [],
              comments: [],
              comment_count: 0,
            },
            ...prev,
          ];
        });
      });
  }, [currentUserId]);

  const handlePostDelete = useCallback((payload) => {
    const deletedId = payload.old.id;
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  }, []);

  const handleReactionChange = useCallback((payload) => {
    const { eventType } = payload;
    const record = payload.new || payload.old;
    const postId = record.post_id;
    // Skip own reactions — already handled optimistically
    if (record.user_id === currentUserId) return;

    if (eventType === 'INSERT') {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          if (p.reactions.some((r) => r.id === record.id)) return p;
          const reactions = [...p.reactions, { id: record.id, emoji: record.emoji, user_id: record.user_id }];
          return { ...p, reactions };
        })
      );
    } else if (eventType === 'UPDATE') {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const reactions = p.reactions.map((r) =>
            r.id === record.id ? { ...r, emoji: record.emoji } : r
          );
          return { ...p, reactions };
        })
      );
    } else if (eventType === 'DELETE') {
      const deletedId = payload.old.id;
      const deletedPostId = payload.old.post_id;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== deletedPostId) return p;
          const reactions = p.reactions.filter((r) => r.id !== deletedId);
          return { ...p, reactions };
        })
      );
    }
  }, [currentUserId]);

  const handleCommentChange = useCallback((payload) => {
    const { eventType } = payload;
    const record = payload.new || payload.old;
    const postId = record.post_id;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const delta = eventType === 'INSERT' ? 1 : eventType === 'DELETE' ? -1 : 0;
        return { ...p, comment_count: Math.max(0, (p.comment_count ?? 0) + delta) };
      })
    );
  }, []);

  // ── Subscribe to realtime (single consolidated channel) ──
  const setupRealtime = useCallback(() => {
    // Clean existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        handlePostInsert
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        handlePostDelete
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        handleReactionChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        handleCommentChange
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(setupRealtime, 2000);
        }
      });

    channelRef.current = channel;
  }, [handlePostInsert, handlePostDelete, handleReactionChange, handleCommentChange]);

  // ── Check channel health & reconnect if dead ──
  const checkChannelHealth = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state === 'errored' || ch.state === 'closed') {
      setupRealtime();
    }
  }, [setupRealtime]);

  // ── Background tab visibility handler ──
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchPosts();
        checkChannelHealth();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPosts, checkChannelHealth]);

  // ── Health check: verify channel is alive every 30s ──
  useEffect(() => {
    healthRef.current = setInterval(checkChannelHealth, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(healthRef.current);
  }, [checkChannelHealth]);

  // ── Soft refresh: full feed sync every 2 min as safety net ──
  useEffect(() => {
    softRefreshRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPosts();
      }
    }, SOFT_REFRESH_INTERVAL);
    return () => clearInterval(softRefreshRef.current);
  }, [fetchPosts]);

  // ── Initial load + realtime setup ──
  useEffect(() => {
    fetchPosts();
    setupRealtime();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchPosts, setupRealtime]);

  // ── Optimistic post callback ──
  const handlePostCreated = useCallback((newPost) => {
    if (newPost) {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [
          {
            ...newPost,
            users: { anon_username: profile?.anon_username ?? 'Anon' },
            reactions: [],
            comments: [],
            comment_count: 0,
          },
          ...prev,
        ];
      });
    }
  }, [profile]);

  // ── Optimistic updaters passed to PostCard ──
  const patchPost = useCallback((postId, updater) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  }, []);

  const removePost = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  // ── Infinite scroll observer ──
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <CreatePost onPosted={handlePostCreated} />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-5 border border-border animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                  <div className="h-3 w-12 bg-zinc-800 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-zinc-800 rounded" />
                  <div className="h-3 w-3/4 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No posts yet. Be the first to say something.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={profile?.id}
                patchPost={patchPost}
                removePost={removePost}
              />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="text-center py-4 text-zinc-500 text-sm">Loading more...</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
