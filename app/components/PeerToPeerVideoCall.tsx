import { cn } from "~/utils/cn";
import { AiOutlineAudioMuted } from "react-icons/ai";
import { FaMicrophoneAlt } from "react-icons/fa";
import { BsCameraVideo } from "react-icons/bs";
import { BsCameraVideoOff } from "react-icons/bs";
// import { LuScreenShare } from "react-icons/lu";
import { ImPhoneHangUp } from "react-icons/im";
import { IoCopyOutline } from "react-icons/io5";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  useUserMedia,
  type MediaConstraints,
} from "~/routes/talleres/rtc_utils";
import { useWebRTC } from "~/routes/talleres/useWebRTC";

export const PeerToPeerVideoCall = ({
  id,
  onDisconnect,
  onCopyLink,
  isCreator,
}: {
  isCreator?: boolean;
  id?: string;
  onCopyLink?: (arg0: string | null) => void;
  onDisconnect: () => void;
}) => {
  const { room, remoteVideoRef, videoRef } = useWebRTC(id, {
    isCreator,
    onError() {
      onDisconnect();
    },
  });
  return (
    <>
      <ul className="text-white">
        <h2 className="text-2xl text-white pt-20">Participantes?</h2>
        {room.map((peer) => (
          <li key={peer}>{peer}</li>
        ))}
      </ul>
      <article className="h-screen pt-12 relative">
        <VideoStream
          // isMuted={false}
          ref={remoteVideoRef}
          className="absolute top-20 inset-0"
        />
        <VideoStream
          ref={videoRef}
          className="absolute bottom-4 right-4 h-40 aspect-square"
        />
        <Controls
          // id={peerId}
          // onToggleVideo={toggleConstraint("video")}
          // onToggleAudio={toggleConstraint("audio")}
          onCopyLink={() => {
            // onCopyLink?.(peerId);
          }}
          onHangup={onDisconnect}
          // constraints={constraints}
        />
      </article>
    </>
  );
};

const VideoStream = ({
  className = "aspect-video",
  ref,
  isMuted = true,
  ...props
}: {
  isMuted?: boolean;
  ref: RefObject<HTMLVideoElement | null>;
  className?: string;
  [x: string]: unknown;
}) => {
  return (
    <div className={className}>
      <video
        ref={ref}
        className={cn(
          "scale-x-[-1]",
          "object-cover",
          "w-full h-full",
          "border-2 border-white rounded-3xl",
          className
        )}
        autoPlay
        muted={isMuted}
        {...props}
      />
    </div>
  );
};

const Controls = ({
  onCopyLink,
  id,
  onHangup,
  onToggleAudio,
  onToggleVideo,
  constraints = {},
}: {
  id?: string;
  constraints: MediaConstraints;
  onToggleVideo?: () => void;
  onToggleAudio?: () => void;
  onHangup?: () => void;
  onCopyLink?: () => void;
}) => {
  return (
    <nav className="absolute bottom-8 left-8 flex gap-4">
      <Button onClick={onToggleAudio} isMuted={!constraints.audio}>
        {constraints.audio ? <FaMicrophoneAlt /> : <AiOutlineAudioMuted />}
      </Button>
      <Button isMuted={!constraints.video} onClick={onToggleVideo}>
        {constraints.video ? <BsCameraVideo /> : <BsCameraVideoOff />}
      </Button>
      <Button
        onClick={onHangup}
        isMuted={false}
        className="text-red-500 border-red-500"
      >
        <ImPhoneHangUp />
      </Button>
      {id && (
        <Button
          onClick={onCopyLink}
          label="Copiar link de la llamada"
          isMuted={false}
        >
          <IoCopyOutline />
        </Button>
      )}
    </nav>
  );
};

const Button = ({
  className,
  isMuted = true,
  label,
  children,
  ...props
}: {
  children?: ReactNode;
  isMuted?: boolean;
  className?: string;
  [x: string]: unknown;
  label?: ReactNode;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);
  const handleMouseEnter = () => {
    timeout.current = setTimeout(() => {
      setIsHovered(true);
    }, 1000);
  };
  const handleMouseLeave = () => {
    timeout.current && clearTimeout(timeout.current);
    setIsHovered(false);
  };
  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "border-2 text-white",
        "rounded-full p-3 text-2xl",
        "enabled:active:scale-95 enabled:hover:scale-105",
        "transition-all",
        "relative",
        className,
        {
          "bg-red-100 text-red-500": isMuted,
        }
      )}
      {...props}
    >
      <span>{children}</span>
      {label && isHovered && (
        <div
          className={cn(
            "text-xs",
            "p-1 rounded",
            "w-max",
            "absolute top-[-60%] left-[-50%] bg-slate-800"
          )}
        >
          {label}
        </div>
      )}
    </button>
  );
};
