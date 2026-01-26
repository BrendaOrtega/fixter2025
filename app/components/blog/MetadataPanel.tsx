import { useState } from 'react';
import {
  X,
  Link2,
  Image,
  User,
  Tag,
  Globe,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';

interface MetadataPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (title: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  metaImage: string;
  setMetaImage: (url: string) => void;
  youtubeLink: string;
  setYoutubeLink: (url: string) => void;
  author: string;
  setAuthor: (author: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  mainTag: string;
  setMainTag: (tag: string) => void;
}

const AVAILABLE_TAGS = [
  'react', 'typescript', 'javascript', 'css', 'tailwind',
  'node', 'prisma', 'nextjs', 'remix', 'vite',
  'ai', 'claude', 'openai', 'agentes',
  'tutorial', 'opinion', 'carrera',
];

const AUTHORS = [
  { id: 'bliss', name: 'Héctorbliss', handle: '@hectorbliss' },
  { id: 'brendi', name: 'BrendaGo', handle: '@brendago' },
  { id: 'david', name: 'David Zavala', handle: '@DeividZavala' },
];

export function MetadataPanel({
  isOpen,
  onClose,
  title,
  setTitle,
  slug,
  setSlug,
  metaImage,
  setMetaImage,
  youtubeLink,
  setYoutubeLink,
  author,
  setAuthor,
  tags,
  setTags,
  mainTag,
  setMainTag,
}: MetadataPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('seo');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
      if (mainTag === tag) setMainTag('');
    } else {
      setTags([...tags, tag]);
      if (!mainTag) setMainTag(tag);
    }
  };

  const autoGenerateSlug = () => {
    const generated = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(generated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Configuración</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* SEO Section */}
        <section className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('seo')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-indigo-400" />
              <span className="font-medium text-white">SEO y URL</span>
            </div>
            {expandedSection === 'seo' ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {expandedSection === 'seo' && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Un título que enganche"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Slug (URL)
                  <button
                    onClick={autoGenerateSlug}
                    className="ml-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Auto-generar
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">/blog/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="url-del-post"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Media Section */}
        <section className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('media')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <Image size={18} className="text-green-400" />
              <span className="font-medium text-white">Imágenes y Media</span>
            </div>
            {expandedSection === 'media' ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {expandedSection === 'media' && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Imagen OG (1200x630)
                </label>
                <input
                  type="text"
                  value={metaImage}
                  onChange={(e) => setMetaImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {metaImage && (
                  <div className="mt-2 aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={metaImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Video YouTube
                </label>
                <input
                  type="text"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </section>

        {/* Author Section */}
        <section className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('author')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <User size={18} className="text-purple-400" />
              <span className="font-medium text-white">Autor</span>
            </div>
            {expandedSection === 'author' ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {expandedSection === 'author' && (
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {AUTHORS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAuthor(a.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                      author === a.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-gray-500">{a.handle}</div>
                    </div>
                    {author === a.id && (
                      <Check size={18} className="text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tags Section */}
        <section className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-orange-400" />
              <span className="font-medium text-white">Etiquetas</span>
              {tags.length > 0 && (
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
                  {tags.length}
                </span>
              )}
            </div>
            {expandedSection === 'tags' ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {expandedSection === 'tags' && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      tags.includes(tag)
                        ? mainTag === tag
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600/40 text-indigo-200 border border-indigo-500'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                    {mainTag === tag && ' ★'}
                  </button>
                ))}
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Tag principal
                  </label>
                  <select
                    value={mainTag}
                    onChange={(e) => setMainTag(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Preview Section */}
        <section>
          <button
            onClick={() => toggleSection('preview')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-cyan-400" />
              <span className="font-medium text-white">Vista previa OG</span>
            </div>
            {expandedSection === 'preview' ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {expandedSection === 'preview' && (
            <div className="px-4 pb-4">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                {metaImage ? (
                  <img
                    src={metaImage}
                    alt="OG Preview"
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <span className="text-white/50 text-sm">Sin imagen</span>
                  </div>
                )}
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-1">fixtergeek.com</div>
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {title || 'Título del post'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Así se verá en Twitter/LinkedIn
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/80">
        <div className="text-xs text-gray-500 text-center">
          {slug ? (
            <span>
              URL:{' '}
              <a
                href={`https://fixtergeek.com/blog/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                /blog/{slug}
              </a>
            </span>
          ) : (
            <span className="text-orange-400">Define un slug para publicar</span>
          )}
        </div>
      </div>
    </div>
  );
}
