import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Eye, Heading1, Heading2, Heading3, Italic, List, Minus, PencilLine, Quote, Redo2, Type, Undo2 } from 'lucide-react';
import MarkdownContent from './MarkdownContent';

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
  const selectionRef = useRef({ start: 0, end: 0 });
  const historyRef = useRef<string[]>([value || '']);
  const historyIndexRef = useRef(0);
  const [historyMeta, setHistoryMeta] = useState({ index: 0, length: 1 });
  const [preview, setPreview] = useState(false);

  const hasText = useMemo(() => (value || '').trim().length > 0, [value]);

  useEffect(() => {
    const next = value || '';
    const current = historyRef.current[historyIndexRef.current] ?? '';
    if (next === current) return;

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(next);
    historyRef.current = nextHistory.slice(-80);
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryMeta({ index: historyIndexRef.current, length: historyRef.current.length });
  }, [value]);

  const applyValue = (next: string, cursorStart?: number, cursorEnd?: number) => {
    const el = textareaRef.current;
    const scrollY = window.scrollY;
    onChange(next);

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      if (typeof cursorStart === 'number') {
        el.setSelectionRange(cursorStart, typeof cursorEnd === 'number' ? cursorEnd : cursorStart);
      }
      window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'auto' });
    });
  };

  const readSelection = () => {
    const el = textareaRef.current;
    const start = clamp(el?.selectionStart ?? selectionRef.current.start ?? 0, 0, value.length);
    const end = clamp(el?.selectionEnd ?? selectionRef.current.end ?? 0, 0, value.length);
    return { start, end };
  };

  const rememberSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    selectionRef.current = {
      start: clamp(el.selectionStart ?? 0, 0, value.length),
      end: clamp(el.selectionEnd ?? 0, 0, value.length),
    };
  };

  const wrapSelection = (left: string, right = left) => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + left + selected + right + value.slice(end);
    applyValue(next, start + left.length, end + left.length);
  };

  const prefixCurrentLine = (prefix: string) => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    applyValue(next, start + prefix.length, end + prefix.length);
  };

  const prefixSelectedLines = (prefix: string) => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = value.indexOf('\n', end);
    const blockEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, blockEnd);
    const transformed = block
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    const next = value.slice(0, lineStart) + transformed + value.slice(blockEnd);
    applyValue(next, start + prefix.length, end + prefix.length);
  };

  const stripSelectedLines = () => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = value.indexOf('\n', end);
    const blockEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, blockEnd);
    const transformed = block
      .split('\n')
      .map((line) => line.replace(/^(#{1,3}\s+|>\s+|[-*+]\s+)/, ''))
      .join('\n');
    const next = value.slice(0, lineStart) + transformed + value.slice(blockEnd);
    applyValue(next, start, end);
  };

  const insertAtCursor = (text: string) => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    const next = value.slice(0, start) + text + value.slice(end);
    applyValue(next, start + text.length, start + text.length);
  };

  const makeNormalText = () => {
    const selection = readSelection();
    if (!selection) return;
    const { start, end } = selection;
    if (start !== end) {
      stripSelectedLines();
      return;
    }

    const next = value.slice(0, start) + '\n\n' + value.slice(end);
    applyValue(next, start + 2, start + 2);
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setHistoryMeta({ index: historyIndexRef.current, length: historyRef.current.length });
    onChange(historyRef.current[historyIndexRef.current] ?? '');
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setHistoryMeta({ index: historyIndexRef.current, length: historyRef.current.length });
    onChange(historyRef.current[historyIndexRef.current] ?? '');
  };

  const toolbarButtonProps = {
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault(),
    type: 'button' as const,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {label ? <p className="text-sm font-bold text-stone-700 uppercase tracking-widest">{label}</p> : <span />}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            {...toolbarButtonProps}
            onClick={undo}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-40"
            title="Undo"
            disabled={historyMeta.index <= 0}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={redo}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-40"
            title="Redo"
            disabled={historyMeta.index >= historyMeta.length - 1}
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={makeNormalText}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Normal text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => prefixCurrentLine('# ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => prefixCurrentLine('## ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => prefixCurrentLine('### ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => wrapSelection('**')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => wrapSelection('_')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => prefixCurrentLine('> ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => insertAtCursor('\n> "Pull quote here"\n> - Name\n')}
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
          >
            Pull
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => insertAtCursor('\n\n---\n\n')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="Horizontal line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
            onClick={() => prefixSelectedLines('- ')}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            {...toolbarButtonProps}
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
          onSelect={rememberSelection}
          onClick={rememberSelection}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
        />
      )}
    </div>
  );
}
