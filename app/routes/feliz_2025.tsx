import {
  Form,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import type { Route } from "./+types/feliz_2025";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImWhatsapp } from "react-icons/im";
import { ImFacebook2 } from "react-icons/im";
import { getMetaTags } from "~/utils/getMetaTags";
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeMute } from "react-icons/fa";

export const meta = ({ data: { nombre } }) =>
  getMetaTags({
    title: "Tienes una sorpresa esperándote 🎁",
    description: `${nombre} Te dejó un mensaje`,
    image: "/xmas/mail-gift.png",
  });

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  return {
    nombre: params.nombre,
  };
};

export default function Route({}: Route.ComponentProps) {
  const { nombre } = useLoaderData();
  const [share, setShare] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleWriting = (event: ChangeEvent<HTMLInputElement>) => {
    timeout.current && clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      navigate("/feliz_2025/" + event.target.value);
      setShare(true);
    }, 1000);
  };

  const whatsURL = new URL("https://api.whatsapp.com/send");
  whatsURL.searchParams.set(
    "text",
    `${nombre} dejó un mensaje sorpresa para ti: 🎁\nhttps://fixter2025.fly.dev/feliz_2025/${nombre}`
  );

  const faceURL = new URL("https://www.facebook.com/sharer/sharer.php");
  faceURL.searchParams.set(
    "u",
    `https://fixter2025.fly.dev/feliz_2025/${nombre}`
  );

  const handleVolumeClick = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <article className="pt-10 text-white grid place-content-center h-screen place-items-center gap-2 px-5 overflow-hidden">
        <h1 className="text-4xl text-center max-w-lg animate-pulse font-bold">
          ¡Feliz año nuevo! 🥂🍾🎉🎊🪅
        </h1>
        <img
          src={"/xmas/2025colorful-3d.png"}
          className="h-20 animate-bounce"
        />
        <BackCounter />
        <p className="text-2xl">Te desean:</p>
        <h2 className="text-4xl">{nombre} 🥰</h2>
        <p>Y tus amigos de:</p>
        <img src="/logo.svg" alt="logo" />
        <button
          onClick={handleVolumeClick}
          className="text-3xl border p-2 rounded-xl"
        >
          {isPlaying ? <FaVolumeHigh /> : <FaVolumeMute />}
        </button>
        <Form>
          <input
            onFocus={handleVolumeClick}
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
            <div className="flex justify-center gap-3">
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
      {isPlaying && <EmojiConfetti emojis={false} colors />}
      <Marquees />
      <audio ref={audioRef} src="/xmas/fireworks.mp3" />
    </>
  );
}

export const BackCounter = ({ date }: { date?: Date }) => {
  const timeout = useRef<ReturnType<typeof setInterval>>(null);
  const newYearsDay = new Date(date || "01/01/2025");
  const [remain, setRemain] = useState<{
    days: number;
    hours: number;
    mins: number;
    secs: number;
  }>({ days: 0, hours: 0, mins: 0, secs: 0 });
  // const dayFactor = 1000 * 60 * 60 * 24;
  let oneMin = 60 * 1000;
  //1hr => 60 minutes
  let oneHr = 60 * oneMin;
  //1 day => 24 hours
  let oneDay = 24 * oneHr;

  const getmissingDays = (remainingTime: number) => {
    return Math.floor(remainingTime / oneDay);
  };

  const getmissingHours = (remainingTime: number) => {
    return Math.floor((remainingTime % oneDay) / oneHr);
  };

  const getmissingMinutes = (remainingTime: number) => {
    return Math.floor((remainingTime % oneHr) / oneMin);
  };

  const getmissingSeconds = (remainingTime: number) => {
    return Math.floor((remainingTime % oneMin) / 1000);
  };

  useEffect(() => {
    const count = () => {
      timeout.current && clearTimeout(timeout.current);
      timeout.current = setInterval(() => {
        const remainingTime = newYearsDay.getTime() - new Date().getTime();
        setRemain({
          days: getmissingDays(remainingTime),
          hours: getmissingHours(remainingTime),
          mins: getmissingMinutes(remainingTime),
          secs: getmissingSeconds(remainingTime),
        });
      }, 1000);
    };
    count();
  }, []);

  return (
    <p className="text-center font-bold text-xs">
      <p> Faltan:</p> <span className="text-brand-700">{remain.days} </span>
      Días, <span className="text-brand-700">{remain.hours} </span>horas,{" "}
      <span className="text-brand-700">{remain.mins} </span>minutos y{" "}
      <span className="text-brand-700">{remain.secs} </span>segundos
      <p>Para año nuevo</p>
    </p>
  );
};

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
