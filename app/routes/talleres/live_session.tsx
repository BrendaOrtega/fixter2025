import { FaMicrophone } from "react-icons/fa6";
import { useUserMedia } from "./rtc_utils";
import { useNavigate } from "react-router";
import { FaMicrophoneAltSlash } from "react-icons/fa";
import { IoMdVideocam } from "react-icons/io";
import { IoVideocamOff } from "react-icons/io5";
import { cn } from "~/utils/cn";
import { PeerToPeerVideoCall } from "~/components/PeerToPeerVideoCall";
import type { Route } from "./+types/live_session";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type") as "call" | "join";
  console.info("::TYPE::", type);
  return { id, type };
};

export default function Page({ loaderData }: Route.ComponentProps) {
  const { id, type } = loaderData;
  const navigate = useNavigate();
  const { disconnect, videoRef, constraints, toggleConstraint } =
    useUserMedia(); // for preparation only
  // methods
  const startCall = () => navigate("/live_session?" + "type=call"); // @todo improve names semantics

  const handleDisconection = () => {
    disconnect();
    // setCallId(null);
    navigate("/live_session");
  };
  const copyLink = (peerId: string) => {
    const url = new URL(location.href);
    url.searchParams.set("id", peerId);
    url.searchParams.set("type", "join");
    console.log("URL: ", url.toString());
    navigator.clipboard.writeText(url.toString());
  };

  // screen replacer
  if (type) {
    return (
      <PeerToPeerVideoCall
        id={id}
        type={type}
        onCopyLink={copyLink}
        onDisconnect={handleDisconection}
      />
    );
  }

  return (
    <article className="flex flex-col items-center justify-center h-screen text-white max-w-3xl mx-auto gap-4">
      <h1 className="text-2xl">
        ¿List@ para tu sesión en vivo con el blissmo?
      </h1>
      <video
        poster="https://i.imgur.com/mpzZhT9.png"
        ref={videoRef}
        muted
        autoPlay
        className="aspect-video h-80 border-2 rounded-2xl"
      ></video>
      <nav className="flex flex-col items-stretch gap-2">
        <div className="flex gap-2">
          <Button onClick={toggleConstraint("audio")}>
            {constraints.audio ? <FaMicrophone /> : <FaMicrophoneAltSlash />}
          </Button>
          <Button onClick={toggleConstraint("video")}>
            {constraints.video ? <IoMdVideocam /> : <IoVideocamOff />}
          </Button>
        </div>
        <Button onClick={startCall}>Iniciar llamada</Button>
      </nav>
    </article>
  );
}

const Button = ({ ...props }) => {
  return (
    <button
      className={cn(
        "flex",
        "items-center justify-center",
        "p-4 border rounded-xl",
        "w-full",
        "enabled:active:scale-100 enabled:hover:scale-105",
        "transition-all"
      )}
      {...props}
    />
  );
};
