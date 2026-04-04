import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import { Send, Trash2, ArrowDown } from 'lucide-react';

const PAGE_SIZE = 50;

export default function ChatPage() {
  const { profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const channelRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Check if user is scrolled near the bottom
  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 150;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, []);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id, users!messages_user_id_fkey ( anon_username )')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Fetch messages error:', error);
      setLoading(false);
      return;
    }

    setMessages((data || []).reverse());
    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
    // Scroll to bottom after initial load
    setTimeout(() => scrollToBottom(false), 50);
  }, [scrollToBottom]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldest = messages[0]?.created_at;
    const el = containerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;

    const { data, error } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id, users!messages_user_id_fkey ( anon_username )')
      .order('created_at', { ascending: false })
      .lt('created_at', oldest)
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Load more error:', error);
      setLoadingMore(false);
      return;
    }

    const older = (data || []).reverse();
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const unique = older.filter((m) => !existingIds.has(m.id));
      return [...unique, ...prev];
    });
    setHasMore((data || []).length === PAGE_SIZE);
    setLoadingMore(false);

    // Maintain scroll position after prepending
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      }
    });
  }, [loadingMore, hasMore, messages]);

  // Send a message
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_id: profile.id,
      users: { anon_username: profile.anon_username },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 10);

    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: profile.id, content })
      .select('id')
      .single();

    if (error) {
      console.error('Send error:', error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      // Replace temp id with real id
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
      );
    }

    setSending(false);
  }, [input, sending, profile, scrollToBottom]);

  // Delete a message
  const handleDelete = useCallback(async (msgId) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) console.error('Delete error:', error);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          // Skip own messages (handled optimistically)
          if (newMsg.user_id === profile?.id) return;

          // Fetch the username for the new message
          supabase
            .from('users')
            .select('anon_username')
            .eq('id', newMsg.user_id)
            .single()
            .then(({ data }) => {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [
                  ...prev,
                  {
                    ...newMsg,
                    users: { anon_username: data?.anon_username ?? 'Anon' },
                  },
                ];
              });

              // Auto-scroll if user was near bottom
              if (isNearBottomRef.current) {
                setTimeout(() => scrollToBottom(), 10);
              }
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        }
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [profile?.id, scrollToBottom]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll observer for "load more" at the top
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleScroll() {
      checkNearBottom();
      if (el.scrollTop < 80 && hasMore && !loadingMore) {
        loadMore();
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loadMore, checkNearBottom]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      <Header />
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full overflow-hidden">
        {/* Messages area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth"
        >
          {loadingMore && (
            <div className="text-center py-2 text-zinc-600 text-xs">Loading older messages...</div>
          )}
          {!hasMore && messages.length > 0 && (
            <div className="text-center py-2 text-zinc-700 text-xs">Beginning of chat</div>
          )}

          {loading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex gap-2">
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-3 w-40 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              No messages yet. Say something!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const sameSender = prev?.user_id === msg.user_id;
              const timeDiff = prev
                ? new Date(msg.created_at) - new Date(prev.created_at)
                : Infinity;
              const grouped = sameSender && timeDiff < 60_000;

              return (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.user_id === profile?.id}
                  isAdmin={isAdmin}
                  grouped={grouped}
                  onDelete={handleDelete}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom FAB */}
        {showScrollBtn && (
          <div className="relative">
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-surface border border-border rounded-full p-2 shadow-lg hover:bg-surface-light transition-colors cursor-pointer animate-fade-in"
            >
              <ArrowDown size={16} className="text-zinc-400" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-black/80 backdrop-blur-md px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-brand resize-none max-h-24 overflow-y-auto"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <div className="text-right mt-1">
            <span className={`text-xs ${input.length > 450 ? 'text-red-400' : 'text-zinc-700'}`}>
              {input.length}/500
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChatBubble = memo(function ChatBubble({ msg, isOwn, isAdmin, grouped, onDelete }) {
  const username = msg.users?.anon_username ?? 'Anon';
  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'} group`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!grouped && (
          <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium text-brand-light">{username}</span>
            <span className="text-[10px] text-zinc-600">{time}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {isOwn && hover && (isOwn || isAdmin) && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all cursor-pointer p-1"
            >
              <Trash2 size={12} />
            </button>
          )}
          <div
            className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed break-words animate-msg-in ${
              isOwn
                ? 'bg-brand/20 text-white rounded-br-md'
                : 'bg-surface-light text-zinc-200 border border-border rounded-bl-md'
            }`}
          >
            {msg.content}
          </div>
          {!isOwn && hover && isAdmin && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all cursor-pointer p-1"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {grouped && hover && (
          <span className={`text-[10px] text-zinc-700 mt-0.5 ${isOwn ? 'text-right' : ''}`}>{time}</span>
        )}
      </div>
    </div>
  );
});
