import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, description, confirmLabel = 'Delete', danger = true } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ title, description, confirmLabel, danger });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    setState(null);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
          <div className="relative bg-neutral-900 rounded-xl shadow-lg p-6 w-[90%] max-w-sm space-y-4 animate-confirm">
            <h3 className="text-white text-base font-semibold">{state.title}</h3>
            {state.description && (
              <p className="text-zinc-400 text-sm">{state.description}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded-lg bg-neutral-800 text-zinc-300 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  state.danger
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-brand hover:bg-brand-light text-white'
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
