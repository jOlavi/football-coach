import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}

export function Modal({ title, onClose, children, wide = false, extraWide = false }: ModalProps) {
  const widthClass = extraWide ? 'sm:max-w-5xl' : wide ? 'sm:max-w-2xl' : 'sm:max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 bg-black/40">
      <div className={`bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full ${widthClass} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
