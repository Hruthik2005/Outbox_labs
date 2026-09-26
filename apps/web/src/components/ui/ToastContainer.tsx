import React from 'react';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          error: <AlertCircle className="h-4 w-4 text-rose-600" />,
          info: <Info className="h-4 w-4 text-zinc-700" />
        }[toast.type];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-2"
          >
            {icon}
            <span className="text-sm font-medium text-zinc-800">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
