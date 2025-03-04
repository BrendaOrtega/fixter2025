import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { useICEPreventCollition } from "~/hooks/useICEPreventCollition";
import { useToast } from "~/hooks/useToaster";

type PeerData = {
  participants?: string[];
  roomId?: string;
  peerId?: string;
  intent:
    | "peer_joined"
    | "peer_left"
    | "rollback"
    | "negotiation"
    | "offer"
    | "answer"
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
  roomId: string = "perro_room",
  options?: { onError?: (arg0: unknown) => void; isCreator?: boolean }
) => {
  const { onError = noop, isCreator } = options || {};
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket>(null);
  const [room, setRoom] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<Record<string, any>>({
    audio: true,
    video: true,
    // video: {
    //   width: { max: 480 },
    //   height: { max: 320 },
    //   frameRate: { max: 15 },
    //   //   facingMode: { exact: "user" },
    // },
  });
  const peerId = useRef(nanoid(3)).current;
  //   const [peers, setPeers] = useState<Peer[]>([]);
  const selfConnectionRef = useRef<RTCPeerConnection>(null);
  const selfStream = useRef<MediaStream>(null);
  //   const socketRef = useRef<any>(null);
  // connection
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    socketRef.current = ws;
    ws.onopen = async function (event) {
      console.log("::SOCKET_IS::", event.type);
      createPeer(peerId, true);
      ws.send(
        json({
          roomId,
          peerId,
          intent: "join",
        })
      );
    };
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data) as PeerData;
      switch (data.intent) {
        case "peer_joined":
          handlePeerJoin(data);
          break;
        case "peer_left":
          handlePeerLeft(data);
          break;
        case "offer":
          handleOffer(data);
          break;
        case "answer":
          handleAnswer(data.description!);
          break;
        case "candidate":
          handleCandidate(data.candidate!);
          break;
      }
    };
    ws.onerror = (ev) => console.warn("::WEBSOCKET_ERROR::", ev);

    return () => {
      if (ws.OPEN !== 1) return;
      ws.close();
    };
  }, []);

  const isFirst = useRef(false);
  const offering = useRef(false);
  const handleOffer = async ({
    description,
  }: {
    description: RTCSessionDescriptionInit;
  }) => {
    console.log("Handling offer");
    await selfConnectionRef.current!.setRemoteDescription(description);
    await selfConnectionRef.current!.setLocalDescription();
    socketRef.current!.send(
      json({
        description: selfConnectionRef.current!.localDescription,
        intent: "answer",
      })
    );
  };

  const handleAnswer = async (description: RTCSessionDescriptionInit) => {
    await selfConnectionRef.current!.setRemoteDescription(description);
  };

  const handleCandidate = (candidate: RTCIceCandidateInit) => {
    if (!selfConnectionRef.current!.remoteDescription) return;

    selfConnectionRef.current?.addIceCandidate(candidate); // @todo check if remote exist
  };

  const createPeer = async (peerId: string, isSelf: boolean = false) => {
    const peer = {
      isSelf,
      id: peerId,
      connection: new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      }),
    };
    selfConnectionRef.current = peer.connection; // experiment
    console.log("Constainsrt", constraints);
    selfStream.current = await getUserMedia(constraints as any); // @todo types
    for (let track of selfStream.current!.getTracks()) {
      console.log("track", track);
      selfConnectionRef.current!.addTrack(track, selfStream.current!);
      // We NEED the Fucking! (sorry, this was though) Stream container    ^
    }
    registerRtcCallbacks();
    videoRef.current!.srcObject = selfStream.current;
  };

  function registerRtcCallbacks() {
    selfConnectionRef.current!.onnegotiationneeded = onnegotiationneeded;
    selfConnectionRef.current!.onicecandidate = onicecandidate;
    selfConnectionRef.current!.ontrack = ontrack;
    console.info("::PEER_REGISTERED::");
  }

  // send any ice candidates to the other peer
  function onicecandidate({
    candidate,
  }: {
    candidate: RTCIceCandidate | null;
  }) {
    if (!candidate || !selfConnectionRef.current?.remoteDescription) return;

    socketRef.current!.send(
      json({
        candidate,
        intent: "candidate", // shared
      })
    );
  }

  async function onnegotiationneeded() {
    if (isFirst.current) return;

    await selfConnectionRef.current!.setLocalDescription(); // guest sets local offer
    console.log("OFERRING", selfConnectionRef.current!.signalingState);
    socketRef.current!.send(
      json({
        description: selfConnectionRef.current!.localDescription,
        intent: "offer",
      })
    );
  }

  async function ontrack({ track, streams: [stream] }: RTCTrackEvent) {
    console.log("::ON_TRACK::", selfConnectionRef.current!.signalingState);
    console.log("::STREAM::", !!stream);
    console.log("::TRACK::", track);

    remoteVideoRef.current!.srcObject = stream;
  }

  // todo
  const handlePeerLeft = (data: PeerData) => {
    // toast.error({
    //   text: data.peerId + " ha dejado la sala::",
    // });
    // setRoom(data.participants);
  };

  const toast = useToast();
  const handlePeerJoin = (data: PeerData) => {
    toast.success({
      text: "Se ha unido un nuevo participante::" + data.peerId,
    });
    console.info(
      "Setting first: ",
      data.participants,
      data.participants!.length === 1
    );
    isFirst.current = isFirst.current
      ? isFirst.current
      : data.participants!.length === 1;
    // videoRef.current!.srcObject = localStream; // @todo remote
    setRoom(data.participants!);
  };

  const getUserMedia = (
    constraints: { audio: boolean; video: boolean } = {
      video: true,
      audio: true,
    }
  ) => {
    return navigator.mediaDevices
      .getUserMedia(constraints)
      .then((mediaStream) => mediaStream)
      .catch((err) => {
        console.info("::USER_MEDIA_ERROR::", err);
        onError?.(err);
        return err;
      });
  };

  return {
    room,
    remoteVideoRef,
    videoRef,
  };
};
