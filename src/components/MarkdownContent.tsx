import React from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  value?: string | null;
  className?: string;
  variant?: 'light' | 'dark';
};

export default function MarkdownContent({ value, className, variant = 'light' }: Props) {
  const text = (value || '').trim();
  if (!text) return null;

  const baseText = variant === 'dark' ? 'text-stone-200' : 'text-stone-700';
  const headingText = variant === 'dark' ? 'text-white' : 'text-primary';
  const quoteBorder = variant === 'dark' ? 'border-white/20' : 'border-stone-200';
  const quoteBg = variant === 'dark' ? 'bg-white/5' : 'bg-stone-50';
  const headingBorder = variant === 'dark' ? 'border-white/10' : 'border-stone-200/80';
  const hrLine = variant === 'dark' ? 'via-white/20' : 'via-stone-300';
  const linkText = variant === 'dark' ? 'text-accent' : 'text-accent';

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          h1: (props) => (
            <h1
              {...props}
              className={`mt-10 mb-4 text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.1] ${headingText}`}
            />
          ),
          h2: (props) => (
            <h2
              {...props}
              className={`mt-10 mb-4 pb-2 text-2xl md:text-3xl font-bold tracking-tight leading-[1.15] ${headingText} border-b ${headingBorder}`}
            />
          ),
          h3: (props) => (
            <h3
              {...props}
              className={`mt-8 mb-3 text-xl md:text-2xl font-bold tracking-tight leading-[1.2] ${headingText}`}
            />
          ),
          p: (props) => <p {...props} className={`my-4 text-base md:text-lg leading-relaxed ${baseText}`} />,
          strong: (props) => <strong {...props} className={variant === 'dark' ? 'text-white' : 'text-primary'} />,
          em: (props) => <em {...props} className="italic" />,
          ul: (props) => <ul {...props} className={`my-4 pl-6 list-disc space-y-2 ${baseText}`} />,
          ol: (props) => <ol {...props} className={`my-4 pl-6 list-decimal space-y-2 ${baseText}`} />,
          li: (props) => <li {...props} className={`text-base md:text-lg leading-relaxed ${baseText}`} />,
          blockquote: (props) => (
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
          a: (props) => <a {...props} className={`${linkText} font-bold underline underline-offset-4`} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
