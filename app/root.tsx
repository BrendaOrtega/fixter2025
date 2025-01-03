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
import { getMetaTags } from "./utils/getMetaTags";

import type { Route } from "./+types/root";

export const meta = () =>
  getMetaTags({
    title: "Tienes un mensaje sorpresa esperandote 🎁",
    description: `Te han dejado un mensaje`,
    image: "/xmas/message-alert.png",
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

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}
