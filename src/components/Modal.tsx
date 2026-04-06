import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-[95vw] max-w-5xl bg-white border border-stone-200 shadow-2xl overflow-hidden rounded-xl max-h-[90vh]"
          >
            <div className="max-h-[90vh] overflow-y-auto">
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-start gap-6 mb-8">
                  <h2 id={titleId} className="text-3xl font-serif font-bold text-primary leading-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
