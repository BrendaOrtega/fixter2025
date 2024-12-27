import {
  Form,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import type { Route } from "./+types/feliz_año";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { useRef, useState, type ChangeEvent } from "react";
import { ImWhatsapp } from "react-icons/im";
import { ImFacebook2 } from "react-icons/im";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  return {
    nombre: params.nombre,
  };
};

function daysBetween(one: Date, another: Date) {
  return Math.round(Math.abs(+one - +another) / 8.64e7);
}

export default function Route({}: Route.ComponentProps) {
  const { nombre } = useLoaderData();
  const [share, setShare] = useState(true);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);
  const navigate = useNavigate();

  const handleWriting = (event: ChangeEvent<HTMLInputElement>) => {
    timeout.current && clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      navigate("/feliz_año/" + event.target.value);
      setShare(true);
    }, 1000);
  };

  const whatsURL = new URL("https://api.whatsapp.com/send");
  whatsURL.searchParams.set(
    "text",
    `Tengo un mensaje sorpresa para ti: 🎁\nhttp://localhost:3000/feliz_año/${nombre}`
  );

  const faceURL = new URL("https://www.facebook.com/sharer/sharer.php");
  faceURL.searchParams.set(
    "u",
    `https%3A%2F%fixter2025.fly.dev/feliz_año/${nombre}`
  );
  faceURL.searchParams.set("n", nombre);
  faceURL.searchParams.set("f", "fa");

  return (
    <>
      <article className="pt-20 text-white grid place-content-center h-screen place-items-center gap-2 px-5 overflow-hidden">
        <h1 className="text-4xl text-center max-w-lg animate-pulse">
          ¡Feliz año nuevo! 🥂🍾🎉🎊🪅
        </h1>
        <img
          src={"/xmas/2025colorful-3d.png"}
          className="h-20 animate-bounce"
        />
        <p className="text-3xl">Te desean:</p>
        <h2 className="text-4xl">{nombre} 🥰</h2>
        <p>Y tus amigos de:</p>
        <img src="/logo.svg" alt="logo" />
        <Form>
          <input
            onChange={handleWriting}
            type="text"
            placeholder="Escribe tu nombre"
            className="rounded-xl text-black text-2xl"
          />
        </Form>
        {share && (
          <div className="">
            <h3 className="text-center mb-2 text-xs">
              Comparte este mensaje con tus seres queridos:
            </h3>
            <div className="flex justify-center">
              <a
                href={whatsURL.toString()}
                className="border rounded-xl inline-block p-2"
              >
                <span className="text-5xl">
                  <ImWhatsapp />
                </span>
              </a>

              <a
                href={faceURL.toString()}
                className="border rounded-xl inline-block p-2"
              >
                <span className="text-5xl">
                  <ImFacebook2 />
                </span>
              </a>
            </div>
          </div>
        )}
      </article>
      <EmojiConfetti />
      <EmojiConfetti emojis={false} colors />
      <Marquees />
    </>
  );
}

export const Marquees = () => {
  return (
    <>
      <marquee
        behavior="scroll"
        direction="up"
        className="fixed h-screen left-0 top-0 text-3xl w-8 pointer-events-none"
      >
        <p>🥂</p>
        <p>🍾</p>
        <p>🎉</p>
        <p>🎊</p>
        <p>🪅</p>
        <p>🎈</p>
        <p>🎂</p>
        <p>🍰</p>
        <p>💕</p>
        <p>🥂</p>
        <p>🍾</p>
        <p>🎉</p>
        <p>🎊</p>
        <p>🪅</p>
        <p>🎈</p>
        <p>🎂</p>
        <p>🍰</p>
        <p>💕</p>
      </marquee>
      <marquee
        behavior="scroll"
        direction="down"
        className="fixed h-screen right-0 top-0 text-3xl w-8 pointer-events-none"
      >
        <p>🥂</p>
        <p>🍾</p>
        <p>🎉</p>
        <p>🎊</p>
        <p>🪅</p>
        <p>🎈</p>
        <p>🎂</p>
        <p>🍰</p>
        <p>💕</p>
        <p>🥂</p>
        <p>🍾</p>
        <p>🎉</p>
        <p>🎊</p>
        <p>🪅</p>
        <p>🎈</p>
        <p>🎂</p>
        <p>🍰</p>
        <p>💕</p>
      </marquee>
    </>
  );
};
