import { useOnlineUsers } from '../lib/useOnlineUsers';

export default function OnlineUsersCounter({ className = '' }) {
  const count = useOnlineUsers();

  return (
    <div className={`bg-surface border border-border rounded-xl p-3 sm:p-4 text-center ${className}`}>
      <p className="text-lg sm:text-2xl font-bold text-green-400">
        <span className="mr-1">🟢</span>{count}
      </p>
      <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Online</p>
    </div>
  );
}
