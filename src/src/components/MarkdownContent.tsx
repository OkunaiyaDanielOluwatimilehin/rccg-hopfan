import React from 'react';
import ReactMarkdown from 'react-markdown';
import ScriptureReference from './ScriptureReference';

type Props = {
  value?: string | null;
  className?: string;
  variant?: 'light' | 'dark';
  enableScriptureLookup?: boolean;
};

function linkifyScriptures(markdown: string) {
  return markdown.replace(
    /\b((?:[1-3]\s)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\d+:\d+(?:-\d+)?)/g,
    '[$1](scripture:$1)',
  );
}

export default function MarkdownContent({ value, className, variant = 'light', enableScriptureLookup = false }: Props) {
  const text = (value || '').trim();
  if (!text) return null;
  const markdownText = enableScriptureLookup ? linkifyScriptures(text) : text;

  const baseText = variant === 'dark' ? 'text-stone-200' : 'text-stone-700';
  const headingText = variant === 'dark' ? 'text-white' : 'text-primary';
  const quoteBorder = variant === 'dark' ? 'border-white/20' : 'border-stone-200';
  const quoteBg = variant === 'dark' ? 'bg-white/5' : 'bg-stone-50';
  const headingBorder = variant === 'dark' ? 'border-white/10' : 'border-stone-200/80';
  const hrLine = variant === 'dark' ? 'via-white/20' : 'via-stone-300';
  const linkText = variant === 'dark' ? 'text-accent' : 'text-accent';

  const markdownComponents = {
    h1: (props: any) => (
      <h1
        {...props}
        className={`mt-10 mb-4 text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.1] ${headingText}`}
      />
    ),
    h2: (props: any) => (
      <h2
        {...props}
        className={`mt-10 mb-4 pb-2 text-2xl md:text-3xl font-bold tracking-tight leading-[1.15] ${headingText} border-b ${headingBorder}`}
      />
    ),
    h3: (props: any) => (
      <h3
        {...props}
        className={`mt-8 mb-3 text-xl md:text-2xl font-bold tracking-tight leading-[1.2] ${headingText}`}
      />
    ),
    p: (props: any) => <p {...props} className={`my-4 text-base md:text-lg leading-relaxed ${baseText}`} />,
    strong: (props: any) => <strong {...props} className={variant === 'dark' ? 'text-white' : 'text-primary'} />,
    em: (props: any) => <em {...props} className="italic" />,
    ul: (props: any) => <ul {...props} className={`my-4 pl-6 list-disc space-y-2 ${baseText}`} />,
    ol: (props: any) => <ol {...props} className={`my-4 pl-6 list-decimal space-y-2 ${baseText}`} />,
    li: (props: any) => <li {...props} className={`text-base md:text-lg leading-relaxed ${baseText}`} />,
    blockquote: (props: any) => (
      <blockquote
        {...props}
        className={`my-6 border-l-4 ${quoteBorder} ${quoteBg} px-5 py-4 italic`}
      />
    ),
    hr: () => (
      <div className="my-10">
        <div className={`h-px w-full bg-gradient-to-r from-transparent ${hrLine} to-transparent`} />
      </div>
    ),
    a: (props: any) => {
      const href = typeof props.href === 'string' ? props.href : '';
      if (href.startsWith('scripture:')) {
        const reference = href.replace(/^scripture:/, '');
        return <ScriptureReference reference={reference}>{props.children}</ScriptureReference>;
      }

      return <a {...props} className={`${linkText} font-bold underline underline-offset-4`} />;
    },
  } as const;

  const renderMarkdown = (markdown: string) => (
    <div>
      <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
    </div>
  );

  const renderAlignedBlocks = () => {
    const lines = text.split(/\r?\n/);
    const blocks: Array<{ align: 'left' | 'center' | 'right' | 'justify'; content: string }> = [];
    let current: string[] = [];
    let currentAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
    let insideAlignBlock = false;

    const pushCurrent = () => {
      if (!current.length) return;
      blocks.push({ align: currentAlign, content: current.join('\n').trim() });
      current = [];
    };

    for (const line of lines) {
      const openMatch = line.match(/^:::\s*(left|center|right|justify)\s*$/i);
      if (openMatch) {
        pushCurrent();
        currentAlign = openMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
        insideAlignBlock = true;
        continue;
      }

      if (insideAlignBlock && /^:::\s*$/.test(line.trim())) {
        pushCurrent();
        currentAlign = 'left';
        insideAlignBlock = false;
        continue;
      }

      current.push(line);
    }

    pushCurrent();

    if (blocks.length === 0) {
      return renderMarkdown(markdownText);
    }

    return (
      <div className="space-y-1">
        {blocks.map((block, index) => {
          const alignClass =
            block.align === 'center'
              ? 'text-center'
              : block.align === 'right'
                ? 'text-right'
                : block.align === 'justify'
                  ? 'text-justify'
                  : 'text-left';

          return (
            <div key={`${block.align}-${index}`} className={alignClass}>
              {renderMarkdown(enableScriptureLookup ? linkifyScriptures(block.content) : block.content)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`text-left ${className || ''}`}>
      {renderAlignedBlocks()}
    </div>
  );
}
