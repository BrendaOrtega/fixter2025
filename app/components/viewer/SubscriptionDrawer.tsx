import { useFetcher } from "react-router";
import { useState } from "react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

type SubscriberVideo = {
  title: string;
  slug: string;
};

export const SubscriptionDrawer = ({
  courseSlug,
  subscriberVideos = [],
}: {
  courseSlug: string;
  subscriberVideos?: SubscriberVideo[];
}) => {
  const [show, setShow] = useState(true);
  const [email, setEmail] = useState("");
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  // Server redirects after setting cookie, no client handling needed

  return (
    <Drawer
      noOverlay
      header={<></>}
      cta={<></>}
      className="z-[300]"
      title="Desbloquea más contenido"
      isOpen={show}
    >
      <div className="pt-20 px-0 md:px-8 relative pb-8">
        <button onClick={() => setShow(false)}>
          <img
            className="h-12 w-12 absolute right-0 top-0"
            alt="close"
            src="/closeDark.png"
          />
        </button>
        <img alt="spaceman" className="w-64 mx-auto" src="/spaceman.svg" />
        <h3 className="text-2xl md:text-3xl text-white mt-16">
          ¿Te está gustando? Suscríbete para continuar
        </h3>
        <p className="text-lg md:text-xl font-light mt-4 text-colorParagraph">
          Ingresa tu email para desbloquear{" "}
          {subscriberVideos.length > 0 ? (
            <>estas lecciones gratis:</>
          ) : (
            <>las siguientes lecciones gratis.</>
          )}
        </p>
        {subscriberVideos.length > 0 && (
          <ul className="mt-4 space-y-2">
            {subscriberVideos.map((video, i) => (
              <li key={i} className="flex items-center gap-2 text-brand-400">
                <span className="text-green-400">✓</span>
                <span className="text-gray-200">{video.title}</span>
              </li>
            ))}
          </ul>
        )}
        <fetcher.Form method="POST">
          <input type="hidden" name="intent" value="subscribe-free" />
          <input type="hidden" name="courseSlug" value={courseSlug} />
          <input type="hidden" name="tag" value={`${courseSlug}-free-access`} />
          <div className="mt-8">
            <label className="text-colorParagraph text-sm">
              Tu email
            </label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full mt-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {fetcher.data?.error && (
            <p className="text-red-400 mt-2 text-sm">{fetcher.data.error}</p>
          )}
          <PrimaryButton
            isLoading={isLoading}
            type="submit"
            variant="fill"
            className="font-semibold w-full mt-8"
          >
            Desbloquear lecciones gratis
          </PrimaryButton>
        </fetcher.Form>
        <p className="text-colorCaption text-xs mt-4 text-center">
          No spam. Solo contenido de valor.
        </p>
      </div>
    </Drawer>
  );
};
