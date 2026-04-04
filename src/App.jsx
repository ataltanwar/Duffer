import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { useTrackPresence } from './lib/useOnlineUsers';
import { NotificationProvider } from './lib/NotificationContext';
import { ConfirmProvider } from './lib/ConfirmContext';
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin h-8 w-8 border-2 border-zinc-700 border-t-zinc-300 rounded-full" />
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  // Track every authenticated user for live online count
  useTrackPresence(session?.user?.id ?? null);

  if (loading) return <Loading />;

  return (
    <ConfirmProvider>
    <NotificationProvider>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route
          path="/home"
          element={session ? <FeedPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!session ? <LoginPage /> : <Navigate to="/home" replace />}
        />
        <Route
          path="/chat"
          element={session ? <ChatPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={session ? <AdminPage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
    </NotificationProvider>
    </ConfirmProvider>
  );
}
