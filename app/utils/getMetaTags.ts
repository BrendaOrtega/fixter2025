export type GetBasicMetaTagsPros = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  twitterCard?: "summary" | "summary_large_image";
  type?: "website" | "article" | "book";
  fbAppId?: string;
  keywords?: string;
  author?: string;
  locale?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

export default function getMetaTags({
  title,
  description = "Cursos de IA, Claude Code, AI SDK y programación en español. Plataforma educativa mexicana con más de 2,000 estudiantes.",
  image = "https://www.fixtergeek.com/cover.png",
  url = "https://www.fixtergeek.com",
  twitterCard = "summary_large_image",
  type = "website",
  fbAppId = "1234567890",
  keywords,
  author = "Héctor Bliss",
  locale = "es_MX",
  publishedTime,
  modifiedTime,
}: GetBasicMetaTagsPros) {
  if (!title) {
    return [
      {
        title: "FixterGeek | Cursos de IA y Programación en Español",
      },
      {
        name: "description",
        content: description,
      },
      {
        property: "fb:app_id",
        content: fbAppId,
      },
      {
        property: "og:locale",
        content: locale,
      },
      {
        name: "author",
        content: author,
      },
      ...(keywords ? [{
        name: "keywords",
        content: keywords,
      }] : []),
    ];
  }
  return [
    { title },
    {
      name: "description",
      content: description,
    },
    // Author meta (importante para GEO)
    {
      name: "author",
      content: author,
    },
    ...(keywords ? [{
      name: "keywords",
      content: keywords,
    }] : []),
    {
      rel: "canonical",
      href: url,
    },
    // Open Graph
    {
      property: "og:title",
      content: title,
    },
    {
      property: "og:description",
      content: description,
    },
    {
      property: "og:image",
      content: image,
    },
    {
      property: "og:type",
      content: type,
    },
    {
      property: "og:url",
      content: url,
    },
    {
      property: "og:site_name",
      content: "FixterGeek",
    },
    // Locale (importante para GEO - indica idioma y región)
    {
      property: "og:locale",
      content: locale,
    },
    // Facebook App ID
    {
      property: "fb:app_id",
      content: fbAppId,
    },
    // Article timestamps (si aplica)
    ...(publishedTime ? [{
      property: "article:published_time",
      content: publishedTime,
    }] : []),
    ...(modifiedTime ? [{
      property: "article:modified_time",
      content: modifiedTime,
    }] : []),
    ...(type === "article" ? [{
      property: "article:author",
      content: author,
    }] : []),
    // Twitter
    {
      name: "twitter:card",
      content: twitterCard,
    },
    {
      name: "twitter:site",
      content: "@FixterGeek",
    },
    {
      name: "twitter:creator",
      content: "@HectorBlisS",
    },
    {
      name: "twitter:title",
      content: title,
    },
    {
      name: "twitter:description",
      content: description,
    },
    {
      name: "twitter:image",
      content: image,
    },
    // Robots meta (asegura indexación)
    {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
  ];
}
