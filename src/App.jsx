import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { useTrackPresence } from './lib/useOnlineUsers';
import { NotificationProvider } from './lib/NotificationContext';
import { ConfirmProvider } from './lib/ConfirmContext';
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-zinc-500">
      Loading...
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
          path="/"
          element={session ? <FeedPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!session ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin"
          element={session ? <AdminPage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </NotificationProvider>
    </ConfirmProvider>
  );
}
