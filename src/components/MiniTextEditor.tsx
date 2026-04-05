import React, { useMemo, useRef, useState } from 'react';
import MarkdownContent from './MarkdownContent';
import { Bold, Eye, Heading1, Heading2, Heading3, Italic, List, Minus, PencilLine, Quote } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  previewTitle?: string;
  previewSubtitle?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MiniTextEditor({ value, onChange, placeholder, rows = 8, label, previewTitle, previewSubtitle }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [preview, setPreview] = useState(false);

  const hasText = useMemo(() => (value || '').trim().length > 0, [value]);

  const applyWrap = (left: string, right = left) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = clamp(el.selectionStart ?? 0, 0, value.length);
    const end = clamp(el.selectionEnd ?? 0, 0, value.length);
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + left + selected + right + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + left.length;
      const cursorEnd = end + left.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = clamp(el.selectionStart ?? 0, 0, value.length);
    const end = clamp(el.selectionEnd ?? 0, 0, value.length);
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + text.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = clamp(el.selectionStart ?? 0, 0, value.length);
    const end = clamp(el.selectionEnd ?? 0, 0, value.length);
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const selected = value.slice(start, end) || '';
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {label ? <p className="text-sm font-bold text-stone-700 uppercase tracking-widest">{label}</p> : <span />}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => prefixLine('# ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => prefixLine('## ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => prefixLine('### ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyWrap('**')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyWrap('_')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => prefixLine('> ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n> "Pull quote here"\n> — Name\n')}
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
          >
            Pull
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n\n---\n\n')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Horizontal line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n- ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={`p-2 border ${
              preview ? 'border-accent bg-accent/10 text-primary' : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
            }`}
            title={preview ? 'Edit' : 'Preview'}
          >
            {preview ? <PencilLine className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="border border-stone-200 bg-white p-6">
          <div className="max-w-3xl mx-auto">
            {previewTitle ? (
              <div className="mb-8 space-y-2">
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-primary">{previewTitle}</h1>
                {previewSubtitle ? <p className="text-lg text-stone-500 leading-relaxed">{previewSubtitle}</p> : null}
              </div>
            ) : null}
            {hasText ? (
              <MarkdownContent value={value} />
            ) : (
              <p className="text-stone-400 italic">Nothing to preview.</p>
            )}
          </div>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
        />
      )}
    </div>
  );
}
