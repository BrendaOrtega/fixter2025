import type { ReactNode } from "react";

interface BookLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  headingsList: ReactNode;
  readingMode?: boolean;
}

export default function BookLayout({
  children,
  sidebar,
  headingsList,
  readingMode = false,
}: BookLayoutProps) {
  return (
    <div
      className={`max-w-7xl mx-auto relative transition-all duration-300 ${
        readingMode ? "max-w-none" : ""
      }`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-0 min-h-screen">
        {/* Sidebar - Tabla de contenidos */}
        {sidebar}

        {/* Contenido principal */}
        <main
          className={`min-w-0 pt-4 pb-8 lg:pt-8 lg:pb-16 bg-white transition-all duration-300 ${
            readingMode
              ? "px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24"
              : "px-4 sm:px-6 lg:px-12"
          }`}
        >
          <div
            className={`mx-auto transition-all duration-300 ${
              readingMode ? "max-w-4xl" : "max-w-3xl"
            }`}
          >
            {children}
          </div>
        </main>

        {/* Lista de títulos */}
        {headingsList}
      </div>
    </div>
  );
}
