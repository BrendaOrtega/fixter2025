import { useEffect, useRef, useState, type RefObject } from "react";
import Peer from "peerjs";
import type { Stream } from "stream";

export type MediaConstraints = {
  audio: boolean;
  video: boolean;
};

export const useUserMedia = () => {
  // const [id, setId] = useState("");
  const peer = useRef<Peer>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [constraints, setConstraints] = useState<MediaConstraints>({
    video: true,
    audio: true,
  });

  const join = async (id: string) => {
    console.info("::JOINING::");
    const mediaStream = await getUserMedia();
    videoRef.current!.srcObject = mediaStream;
    const p = new Peer();
    peer.current = p;
    const call = p.call(id, mediaStream);
    p.on("close", (a) => {
      console.info("JOINING_PEER_CLOSED::", a);
    });
    p.on("error", (e) => console.info("::CALL_ERROR::", e));
    call.on("stream", setRemoteStream);
    call.on("close", (a) => {
      console.info("CALL CLOSED::", a);
    });
    call.on("error", (e) => console.info("::CALL_ERROR::", e));
  };

  const setRemoteStream = (remoteStream: MediaStream) =>
    (remoteVideoRef.current!.srcObject = remoteStream);

  const wait = async (id: string) => {
    console.info("::WAITING::");
    const mediaStream = await getUserMedia();
    videoRef.current!.srcObject = mediaStream;
    const p = new Peer(id);
    peer.current = p;
    p.on("call", (call) => {
      console.info("::INCOMING_CALL::", call);
      call.answer(mediaStream);
      call.on("stream", setRemoteStream);
    });
    p.on("close", (a) => {
      console.info("PEER CLOSED::");
    });
    p.on("error", (e) => console.info("::PEER_ERROR::", e));
  };

  const connectToID = async (id: string, type: "join" | "call") => {
    // setId(id);
    if (!remoteVideoRef.current || !videoRef.current) {
      console.error("::NO_VIDEO_ELEMENTS_FOUND::");
      return;
    }
    console.log("::TYPE::", type);
    type === "join" ? join(id) : wait(id);
  };

  const getUserMedia = () => {
    console.info("::REQUESTING_LOCAL_MEDIA::");
    return navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (mediaStream) {
        console.info("::LOCAL_MEDIA_ADQUIRED::");
        return mediaStream;
      })
      .catch(function (err) {
        console.info("::ERROR::", err);
        // stop();
        return err;
      });
  };

  // @todo change name? getId?
  const initCall = (id?: string) => {
    const p = new Peer(id!);
    peer.current = p;
    return p.id;
  };

  const answerCall = (id: string) => {
    const p = new Peer();
    p.on("call", (call) => {
      console.info("::ANSWERING::");
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (mediaStream) {
          console.info("::LOCAL_MEDIA_ADQUIRED::");
          videoRef.current!.srcObject = mediaStream;
        });
    });
  };

  const disconnect = () => {
    const p = peer.current;
    if (!p) return;

    p.disconnect();
  };

  const updateConstraint = (name: "audio" | "video", val: boolean) => {
    setConstraints((c) => ({ ...c, [name]: val }));
  };
  const toggleConstraint = (name: "audio" | "video") => () => {
    setConstraints((c) => ({ ...c, [name]: !c[name] }));
  };
  const init = async () => {
    await checkPermissions();
    if (!constraints.video && !constraints.audio) {
      videoRef.current!.srcObject = null;
    }
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (mediaStream) {
        videoRef.current!.srcObject = mediaStream;
      })
      .catch(function (err) {
        // stop();
      });
  };

  const checkPermissions = async () => {
    const permissions: MediaConstraints = { audio: false, video: false };
    const promise1 = navigator.permissions
      .query({ name: "microphone" })
      .then((permissionObj) => {
        permissions["audio"] = permissionObj.state !== "denied";
      });
    const promise2 = navigator.permissions
      .query({ name: "camera" })
      .then((permissionObj) => {
        permissions["video"] = permissionObj.state !== "denied";
      });
    await Promise.all([promise1, promise2]);
    if (!permissions.video || !permissions.audio) {
      alert("Porfavor otorga los permisos de audio y video, en tu navegador");
    }
  };

  const stop = () =>
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (mediaStream) {
        videoRef.current!.srcObject = null;
        mediaStream.getTracks().forEach(function (track) {
          track.stop();
        });
      });

  useEffect(() => {
    if (videoRef.current) {
      init();
    }
  }, [videoRef, constraints]);

  return {
    connectToID,
    videoRef,
    updateConstraint,
    constraints,
    toggleConstraint,
    initCall,
    disconnect,
    remoteVideoRef,
    answerCall,
  };
};
