import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { lookupBibleVerse, BibleVerse } from '../services/bibleService';

type Props = {
  reference: string;
  children: React.ReactNode;
};

export default function ScriptureReference({ reference, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const label = useMemo(() => reference.trim(), [reference]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const loadVerse = async () => {
    if (verse || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lookupBibleVerse(label);
      setVerse(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load verse.');
    } finally {
      setLoading(false);
    }
  };

  const show = () => {
    setOpen(true);
    void loadVerse();
  };

  const hide = () => setOpen(false);

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      if (next) void loadVerse();
      return next;
    });
  };

  return (
    <span
      className="relative inline-block align-baseline"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        onClick={toggle}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[0.95em] font-semibold text-primary underline decoration-accent/50 decoration-1 underline-offset-2 hover:bg-accent/15 focus:outline-none focus:ring-4 focus:ring-accent/15"
      >
        <BookOpen className="w-3.5 h-3.5 text-accent" />
        {children}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
          {loading ? (
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Loading verse...
            </div>
          ) : error ? (
            <p className="text-sm text-rose-700">{error}</p>
          ) : verse ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{verse.reference} {verse.version}</p>
              <p className="text-sm leading-relaxed text-stone-700">{verse.passage}</p>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Tap to load verse.</p>
          )}
        </div>
      ) : null}
    </span>
  );
}
