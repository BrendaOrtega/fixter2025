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
      <div className="overflow-x-auto">
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
      </div>
    ) : (
      <code
        className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm font-mono break-words"
        {...props}
      />
    );
  },
  // Estilos específicos para el libro
  p: ({ children }: any) => (
    <p className="text-gray-700 text-xl leading-relaxed mb-6 font-normal">
      {children}
    </p>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-4xl font-bold text-gray-900 mb-8 mt-12">{children}</h1>
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
    <ul className="list-disc list-inside mb-6 space-y-2">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-6 space-y-2">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-gray-700 text-xl ml-4">{children}</li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-purple-400 pl-6 py-2 mb-6 bg-purple-50 rounded-r-lg">
      <div className="text-gray-600 italic">{children}</div>
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
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  hr: () => <hr className="my-12 border-gray-200" />,
};

// Helper function to extract text from React children
function getTextContent(children: any): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return children.toString();
  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }
  if (children && typeof children === 'object' && children.props && children.props.children) {
    return getTextContent(children.props.children);
  }
  return '';
}

// Helper function to generate ID from text
function generateId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\sáéíóúñü-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || 'heading';
}

interface BookMarkdownProps {
  readingMode?: boolean;
  children: string;
}

export default function BookMarkdown({
  readingMode = false,
  children,
}: BookMarkdownProps) {
  // Crear componentes dinámicos basándose en el modo de lectura
  const components = {
    ...SyntaxHighlight,
    p: ({ children }: any) => (
      <p
        className={`text-gray-700 leading-relaxed mb-6 font-normal transition-all duration-300 break-words ${
          readingMode
            ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
            : "text-base sm:text-lg"
        }`}
      >
        {children}
      </p>
    ),
    h1: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h1
          id={id}
          className={`font-bold text-gray-900 mb-8 mt-12 transition-all duration-300 break-words ${
            readingMode
              ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
              : "text-2xl sm:text-3xl lg:text-4xl"
          }`}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h2
          id={id}
          className={`font-semibold text-gray-800 mb-6 mt-10 transition-all duration-300 break-words ${
            readingMode
              ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              : "text-xl sm:text-2xl"
          }`}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h3
          id={id}
          className={`font-semibold text-gray-700 mb-4 mt-8 transition-all duration-300 break-words ${
            readingMode
              ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
              : "text-lg sm:text-xl"
          }`}
        >
          {children}
        </h3>
      );
    },
    h4: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h4
          id={id}
          className={`font-medium text-gray-700 mb-3 mt-6 transition-all duration-300 break-words ${
            readingMode
              ? "text-base sm:text-lg md:text-xl lg:text-2xl"
              : "text-base sm:text-lg"
          }`}
        >
          {children}
        </h4>
      );
    },
    h5: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h5
          id={id}
          className={`font-medium text-gray-600 mb-2 mt-4 transition-all duration-300 break-words ${
            readingMode
              ? "text-sm sm:text-base md:text-lg lg:text-xl"
              : "text-sm sm:text-base"
          }`}
        >
          {children}
        </h5>
      );
    },
    h6: ({ children }: any) => {
      const text = getTextContent(children);
      const id = generateId(text);
      
      return (
        <h6
          id={id}
          className={`font-medium text-gray-500 mb-2 mt-3 transition-all duration-300 break-words ${
            readingMode
              ? "text-xs sm:text-sm md:text-base lg:text-lg"
              : "text-xs sm:text-sm"
          }`}
        >
          {children}
        </h6>
      );
    },
    li: ({ children }: any) => (
      <li
        className={`text-gray-700 ml-4 transition-all duration-300 break-words ${
          readingMode
            ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
            : "text-base sm:text-lg"
        }`}
      >
        {children}
      </li>
    ),
  };

  return (
    <div className="book-markdown">
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
