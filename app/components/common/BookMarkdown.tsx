import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rangeParser from "parse-numeric-range";

const SyntaxHighlight: object = {
  code({ node, inline, className, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const hasMeta = node?.data?.meta;

    const applyHighlights: any = (applyHighlights: any) => {
      if (hasMeta) {
        const RE = /{([\d,-]+)}/;
        const metadata = node.data.meta?.replace(/\s/g, "");
        const strlineNumbers = RE.test(metadata) ? RE.exec(metadata)[1] : "0";
        const highlightLines = rangeParser(strlineNumbers);
        const highlight = highlightLines;
        const data: string = highlight.includes(applyHighlights)
          ? "highlight"
          : null;
        return { data };
      } else {
        return {};
      }
    };

    return !inline && match ? (
      <SyntaxHighlighter
        style={oneLight}
        language={match[1]}
        PreTag="div"
        className="codeStyle rounded-lg shadow-sm border border-gray-200"
        showLineNumbers={true}
        wrapLines={true}
        useunlinestyles={"true"}
        lineProps={applyHighlights}
        {...props}
      />
    ) : (
      <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm font-mono" {...props} />
    );
  },
  // Estilos específicos para el libro
  p: ({ children }: any) => (
    <p className="text-gray-700 text-xl leading-relaxed mb-6 font-normal">
      {children}
    </p>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-4xl font-bold text-gray-900 mb-8 mt-12">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-semibold text-gray-800 mb-6 mt-10">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xl font-semibold text-gray-700 mb-4 mt-8">
      {children}
    </h3>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-6 space-y-2">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-6 space-y-2">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-gray-700 text-xl ml-4">
      {children}
    </li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-purple-400 pl-6 py-2 mb-6 bg-purple-50 rounded-r-lg">
      <div className="text-gray-600 italic">
        {children}
      </div>
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      className="text-purple-600 underline hover:text-purple-700 transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">
      {children}
    </strong>
  ),
  hr: () => (
    <hr className="my-12 border-gray-200" />
  ),
};

export default function BookMarkdown(props: any) {
  return (
    <div className="book-markdown">
      <ReactMarkdown components={SyntaxHighlight} {...props} />
    </div>
  );
}