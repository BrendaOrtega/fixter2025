interface Heading {
  id: string;
  text: string;
  level: number;
}

interface HeadingsListProps {
  headings: Heading[];
  activeHeading: string;
  onHeadingClick: (headingId: string) => void;
  readingMode?: boolean;
}

export default function HeadingsList({
  headings,
  activeHeading,
  onHeadingClick,
  readingMode = false,
}: HeadingsListProps) {
  if (readingMode) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0 py-8 pl-8">
      <div className="sticky top-20">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              En esta sección
            </h4>
          </div>
          {headings.length > 0 ? (
            <nav
              className="max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              style={{
                scrollbarWidth: "none",
              }}
            >
              <div className="p-2 space-y-1">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onHeadingClick(heading.id);
                    }}
                    className={`group block text-left w-full px-3 py-1.5 text-sm rounded-md transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${
                      activeHeading === heading.id
                        ? "bg-purple-100 text-purple-700 font-medium border-l-2 border-purple-500 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    style={{
                      paddingLeft: `${Math.max(
                        (heading.level - 1) * 8 + 12,
                        12
                      )}px`,
                    }}
                    title={heading.text}
                  >
                    <div
                      className={`truncate text-xs leading-5 transition-all duration-200 ${
                        activeHeading === heading.id
                          ? "font-medium"
                          : "group-hover:text-gray-900"
                      }`}
                    >
                      {heading.text}
                    </div>
                  </button>
                ))}
              </div>
            </nav>
          ) : (
            <div className="p-4 text-sm text-gray-500">
              No hay títulos en esta sección
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
