import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isInternalLink(href: string | undefined): boolean {
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (href.startsWith('#')) return true;
  return false;
}

export default function IsaakMarkdown({ text }: { text: string }) {
  return (
    <div className="text-[14px] leading-relaxed text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-1 mt-3 text-[16px] font-bold text-slate-900 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-3 text-[15px] font-bold text-slate-900 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-[14px] font-semibold text-slate-900 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children }) => <ul className="mb-1.5 space-y-0.5 pl-4">{children}</ul>,
          ol: ({ children }) => (
            <ol className="mb-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-700 marker:text-slate-400">{children}</li>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 font-mono text-[12px] text-slate-800">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-1.5 overflow-x-auto rounded-lg bg-slate-100 p-3 text-[12px]">
              {children}
            </pre>
          ),
          a: ({ href, children }) => {
            // Links internos (/foo o #anchor) usan Next.js Link y abren en la
            // misma pestaña — UX clave para CTAs como "conecta tu Holded".
            // Externos abren en pestaña nueva como antes.
            const isInternal = isInternalLink(href);
            const className =
              'text-[#2361d8] underline underline-offset-2 hover:text-[#1d55c2]';
            if (isInternal && href) {
              return (
                <Link href={href} className={className}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="mb-1.5 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-1.5 text-left font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-1.5 text-slate-600">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-1.5 border-l-2 border-[#2361d8]/40 pl-3 text-slate-500 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-slate-200" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
