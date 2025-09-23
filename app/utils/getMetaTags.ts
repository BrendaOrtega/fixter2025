export type GetBasicMetaTagsPros = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  twitterCard?: "summary" | "summary_large_image";
  type?: "website" | "article" | "book";
  fbAppId?: string;
  keywords?: string;
};

export default function getMetaTags({
  title,
  description = "Cursos y recursos de programación y diseño web",
  image = "https://fixtergeek.com/cover.png",
  url = "https://www.fixtergeek.com",
  twitterCard = "summary_large_image",
  type = "website",
  fbAppId = "1234567890", // Placeholder App ID - should be replaced with real FB App ID
  keywords,
}: GetBasicMetaTagsPros) {
  if (!title) {
    return [
      {
        title: "Fixtergeek",
      },
      {
        name: "description",
        content: "Cursos y recursos de programación y diseño web",
      },
      {
        property: "fb:app_id",
        content: fbAppId,
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
      content: "Fixtergeek",
    },
    // Facebook App ID (required by Facebook)
    {
      property: "fb:app_id",
      content: fbAppId,
    },
    // Twitter
    {
      name: "twitter:card",
      content: twitterCard,
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
  ];
}
