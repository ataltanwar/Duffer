import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [note, setNote] = useState(null);
  const timerRef = useRef(null);

  const notify = useCallback((message) => {
    clearTimeout(timerRef.current);
    setNote(message);
    timerRef.current = setTimeout(() => setNote(null), 2000);
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      {note && (
        <div className="fixed bottom-6 left-1/2 z-[100] pointer-events-none animate-notify">
          <div className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
            {note}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
