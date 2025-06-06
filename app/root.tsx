import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  useRouteError,
} from "react-router";
import stylesheet from "./app.css?url";
import useHotjar from "./lib/useHotjar";
import useGoogleTM from "./lib/useGoogleTM";
import { MainLayout } from "./routes/Layout";

import type { Route } from "./+types/root";
import getMetaTags from "./utils/getMetaTags";

export const meta = () =>
  getMetaTags({
    title:
      "Aprende las herramientas que usan los profesionales del open source",
    description: `Conviértete en un profesional del desarrollo web`,
  });

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
  {
    rel: "icon",
    href: "/ico.png",
    type: "image/png",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  useGoogleTM();
  useHotjar();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {/* @todo move layout to routes file */}
        <MainLayout>{children}</MainLayout>
        {/* <ScrollRestoration  /> */}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  const is404 = isRouteErrorResponse(error);
  const isError = error instanceof Error;

  return (
    <div className="text-white pt-20">
      <h1>
        {!isError && !is404 ? (
          <h1>Unknown Error</h1>
        ) : is404 ? (
          <>
            {error.status} {error.statusText}
          </>
        ) : (
          <p>{error.message}</p>
        )}
      </h1>
      {is404 && <p>{error.data}</p>}
      {isError && <pre>{error.stack}</pre>}
    </div>
  );
}
