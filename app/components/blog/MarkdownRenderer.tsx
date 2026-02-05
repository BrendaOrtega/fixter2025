import ReactMarkdown from "react-markdown";
import rehypePrettyCode from "rehype-pretty-code";

interface MarkdownRendererProps {
  children: string;
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      rehypePlugins={[
        [
          rehypePrettyCode,
          {
            theme: "github-dark",
            keepBackground: true,
          },
        ],
      ]}
    >
      {children}
    </ReactMarkdown>
  );
}
