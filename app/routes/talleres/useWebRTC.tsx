import { useEffect, useRef, useState } from "react";
import { useToast } from "~/hooks/useToaster";

// const SOCKET = "ws://localhost:8000/ws";
const SOCKET = "ws://video-converter-hono.fly.dev/ws";

type PeerData = {
  participants?: string[];
  roomId?: string;
  peerId?: string;
  intent:
    | "joined"
    | "peer_joined"
    | "rejected"
    | "create_offer"
    | "answer_the_offer"
    | "connect"
    | "candidate";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type Peer = {
  id: string;
  isSelf: boolean;
  connection: RTCPeerConnection;
};

const json = (data: Record<string, any>) => JSON.stringify(data);
const noop = () => {};

export const useWebRTC = (
  roomId: string = "test_room",
  options?: { onError?: (arg0: unknown) => void; isCreator?: boolean }
) => {
  const { onError = noop } = options || {};
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket>(null);
  const [room, setRoom] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<Record<string, any>>({
    audio: true,
    // video: true,
    video: {
      width: { max: 480 },
      height: { max: 320 },
      frameRate: { max: 15 },
      //   facingMode: { exact: "user" },
    },
  });
  //   const [peers, setPeers] = useState<Peer[]>([]);
  const selfConnectionRef = useRef<RTCPeerConnection>(null);
  const selfStream = useRef<MediaStream>(null);
  //   const socketRef = useRef<any>(null);
  // connection
  useEffect(() => {
    const ws = new WebSocket(SOCKET);
    socketRef.current = ws;
    ws.onopen = (event) => {
      console.log("::SOCKET_IS::", event.type);
      ws.send(
        json({
          roomId,
          intent: "join",
        })
      );
    };
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data) as PeerData;
      switch (data.intent) {
        case "joined":
          handleSelfJoin(data);
          break;
        case "peer_joined":
          handlePeerJoin(data);
          break;
        case "rejected":
          handleRejection();
          break;
        // starter
        case "create_offer":
          createPeer();
          break;
        case "answer_the_offer":
          createAnswer(data);
          break;
        case "connect":
          await selfConnectionRef.current!.setRemoteDescription(
            data.description!
          );
          console.log("Answer:", data.description!);
          break;
        case "candidate":
          handleCandidate(data.candidate);
          break;
      }
    };
    ws.onerror = (ev) => console.warn("::WEBSOCKET_ERROR::", ev);

    return () => {
      if (ws.OPEN !== 1) return;
      ws.close();
    };
  }, []);

  const toast = useToast();
  const [participants, setParticipants] = useState<string[]>([]);
  const peerId = useRef<string | null>(null);
  const isFirst = useRef(false);
  const mediaStream = useRef<MediaStream>(null);

  const handleRejection = () => {
    toast.error({
      text: `Esta sala "${roomId}" ya está llena, crea una nueva. 📞`,
    });
    onError?.(null);
  };

  const handleSelfJoin = ({
    isFirst: first,
    id,
  }: {
    isFirst: boolean;
    id: string;
  }) => {
    peerId.current = id;
    isFirst.current = first;
    console.info("JOINED_TO_ROOM_SUCCESSFULLY");
    requestUserMedia();
  };

  const getUserMedia = (
    constraints: { audio: boolean; video: boolean } = {
      video: true,
      audio: true,
    }
  ): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia(constraints).catch((err) => {
      console.info("::USER_MEDIA_ERROR::", err);
      onError?.(err);
      return err;
    });
  };

  const requestUserMedia = async () => {
    if (!videoRef.current)
      return console.error("Debes asignar un video al ref");

    mediaStream.current = await getUserMedia();
    videoRef.current!.srcObject = mediaStream.current;
  };

  const handlePeerJoin = ({ participants }: { participants: string[] }) => {
    toast.success({
      text: "::Iniciando llamada:: 📞",
    });
    setParticipants(participants);
  };

  const createPeer = async () => {
    const c = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    if (!mediaStream.current) {
      mediaStream.current = await getUserMedia();
    }

    for (let track of mediaStream.current.getTracks()) {
      c.addTrack(track, mediaStream.current);
      // pass the stream    ^
    }
    c.onnegotiationneeded = onnegotiationneeded;
    c.onicecandidate = onicecandidate;
    c.ontrack = ontrack;

    selfConnectionRef.current = c;
    console.info("::PEER_CONNECTION_CREATED::✅");
    return c;
  };

  const createAnswer = async ({
    description,
  }: {
    description: RTCSessionDescriptionInit;
  }) => {
    const c = await createPeer();
    await c.setRemoteDescription(description);
    await c.setLocalDescription();
    socketRef.current!.send(
      json({
        description: c.localDescription,
        intent: "answer",
        roomId,
      })
    );
    selfConnectionRef.current = c;
    console.log("::ANSER_SENT::");
  };

  const handleCandidate = (candidate: RTCIceCandidateInit) => {
    // if (!selfConnectionRef.current!.remoteDescription) return; // revisit
    selfConnectionRef.current!.addIceCandidate(candidate);
  };

  async function ontrack({ streams: [stream] }: RTCTrackEvent) {
    console.log("::ON_TRACK::", selfConnectionRef.current!.signalingState);
    console.log("::STREAM::", !!stream, stream.active);
    remoteVideoRef.current!.srcObject = stream;
  }

  ////////////////////////////////////////////////////// ///////////////////////////

  const handleAnswer = async (description: RTCSessionDescriptionInit) => {
    await selfConnectionRef.current!.setRemoteDescription(description);
  };

  // send any ice candidates to the other peer
  function onicecandidate({
    candidate,
  }: {
    candidate: RTCIceCandidate | null;
  }) {
    if (!candidate || !selfConnectionRef.current?.remoteDescription) return;

    socketRef.current!.send(
      json({
        roomId,
        candidate,
        intent: "candidate", // shared
      })
    );
  }

  /// REUSABLE LISTENERS
  async function onnegotiationneeded() {
    if (isFirst.current) return; // revisit
    console.info("::ICE_NEGOTIATION_STARTED::");

    await selfConnectionRef.current!.setLocalDescription(); // guest sets local offer
    console.info(selfConnectionRef.current!.signalingState);
    socketRef.current!.send(
      json({
        description: selfConnectionRef.current!.localDescription,
        intent: "offer",
        roomId,
      })
    );
  }

  // todo
  const handlePeerLeft = (data: PeerData) => {
    // toast.error({
    //   text: data.peerId + " ha dejado la sala::",
    // });
    // setRoom(data.participants);
  };

  return {
    participants,
    remoteVideoRef,
    videoRef,
  };
};
