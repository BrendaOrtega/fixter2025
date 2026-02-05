import { redirect } from "react-router";

export const loader = async () => {
  throw redirect("/sitemap.xml", 301);
};

export default function SitemapRedirect() {
  return null;
}
