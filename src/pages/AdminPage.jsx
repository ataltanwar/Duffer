import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useConfirm } from '../lib/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import OnlineUsersCounter from '../components/OnlineUsersCounter';

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPosts();
    }
  }, [isAdmin]);

  async function fetchUsers() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoadingData(false);
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, users!posts_user_id_fkey ( anon_username )')
      .order('created_at', { ascending: false })
      .limit(100);
    setPosts(data || []);
  }

  async function toggleBan(user) {
    const newStatus = !user.is_banned;
    const action = newStatus ? 'Ban' : 'Unban';
    const ok = await confirm({ title: `${action} user "${user.anon_username}"?`, confirmLabel: action });
    if (!ok) return;

    const { error } = await supabase
      .from('users')
      .update({ is_banned: newStatus })
      .eq('id', user.id);

    if (error) console.error(`${action} error:`, error);
    else fetchUsers();
  }

  async function deletePost(postId) {
    const ok = await confirm({ title: 'Delete this post?', description: 'This action cannot be undone.' });
    if (!ok) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) console.error('Delete error:', error);
    else fetchPosts();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) return null; // useEffect redirects

  const totalUsers = users.length;
  const bannedUsers = users.filter((u) => u.is_banned).length;
  const adminUsers = users.filter((u) => u.is_admin).length;
  const totalPosts = posts.length;

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <h1 className="text-lg sm:text-xl font-bold text-white">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          <OnlineUsersCounter />
          <StatCard label="Users" value={totalUsers} />
          <StatCard label="Posts" value={totalPosts} />
          <StatCard label="Banned" value={bannedUsers} color="text-red-400" />
          <StatCard label="Admins" value={adminUsers} color="text-brand-light" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
            Users
          </TabButton>
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>
            Posts
          </TabButton>
        </div>

        {loadingData ? (
          <p className="text-zinc-500 text-center py-8">Loading...</p>
        ) : tab === 'users' ? (
          <UserTable users={users} onToggleBan={toggleBan} />
        ) : (
          <PostTable posts={posts} onDelete={deletePost} />
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 text-center">
      <p className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? 'bg-brand/20 text-brand-light'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function UserTable({ users, onToggleBan }) {
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-medium text-white truncate max-w-[120px] sm:max-w-none">
                {user.anon_username}
              </span>
              {user.is_admin && (
                <span className="text-xs bg-brand/20 text-brand-light px-2 py-0.5 rounded-full shrink-0">
                  Admin
                </span>
              )}
              {user.is_banned && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full shrink-0">
                  Banned
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          {!user.is_admin && (
            <button
              onClick={() => onToggleBan(user)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                user.is_banned
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {user.is_banned ? 'Unban' : 'Ban'}
            </button>
          )}
        </div>
      ))}
      {users.length === 0 && (
        <p className="text-zinc-500 text-center py-8">No users found.</p>
      )}
    </div>
  );
}

function PostTable({ posts, onDelete }) {
  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex items-start justify-between gap-2 sm:gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-brand-light">
                {post.users?.anon_username ?? 'Anon'}
              </span>
              <span className="text-xs text-zinc-600">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-zinc-300 break-words">{post.content}</p>
          </div>
          <button
            onClick={() => onDelete(post.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer shrink-0"
          >
            Delete
          </button>
        </div>
      ))}
      {posts.length === 0 && (
        <p className="text-zinc-500 text-center py-8">No posts found.</p>
      )}
    </div>
  );
}
