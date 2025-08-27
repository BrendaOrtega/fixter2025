import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import Peer from "peerjs";
import { nanoid } from "nanoid";

export type MediaConstraints = {
  audio: boolean;
  video: boolean;
};

let pee: Peer;

export const useUserMedia = (config?: { onError?: (e: unknown) => void }) => {
  const { onError } = config || {};
  const [peerId, setId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [constraints, setConstraints] = useState<MediaConstraints>({
    video: true,
    audio: true,
  });
  // @todo types
  let peer;
  const setPeer = (p) => (peer = p);
  // const peer = useStore<any>((state) => state.peer) as Peer;
  // const setPeer = useStore<any>((state) => state.setPeer) as (p: Peer) => void;

  const join = async (id: string) => {
    console.info("::JOINING::", id);
    const mediaStream = await getUserMedia();
    videoRef.current!.srcObject = mediaStream;
    const p = new Peer();
    setPeer(p);
    p.on("open", () => {
      // This waiting is very important
      const call = p.call(id, mediaStream);

      p.on("close", (a) => {
        console.info("JOINING_PEER_CLOSED::", a);
        onError?.(a);
      });
      p.on("error", (e) => console.info("::JOINING_PEER_ERROR::", e));
      call.on("close", (closed) => {
        console.info("::  CALL_CLOSED::", closed);
        onError?.(closed);
      });
      call.on("error", (e) => {
        console.info("::CALL_ERROR::", e);
        onError?.(e);
      });
      call.on("stream", setRemoteStream);
      call.on("iceStateChanged", (e) => {
        console.info("ICE?", e);
      });
    });
  };

  const setRemoteStream = (remoteStream: MediaStream) => {
    console.info("::STARTING::", remoteStream);
    remoteVideoRef.current!.srcObject = remoteStream;
  };

  const wait = async () => {
    console.info("::GENERATING_ID::");
    const key = nanoid(4);
    const p = new Peer(key); // @todo we can wait for uuid
    setPeer(p);
    p.on("open", (id) => {
      console.info("::CONNECTION_OPENED_AND_WAITING_ON::", id);
      setId(id);
    });
    p.on("call", async (call) => {
      const mediaStream = await getUserMedia();
      videoRef.current!.srcObject = mediaStream;
      console.info("::INCOMING_CALL::", call);
      call.answer(mediaStream);
      call.on("stream", setRemoteStream);
    });
    p.on("close", (a) => {
      console.info("PEER CLOSED::");
    });
    p.on("error", (e) => console.info("::PEER_ERROR::", e));
  };

  const connectToID = async (
    id?: string | null
  ): Promise<undefined | Error> => {
    // setId(id);
    if (!remoteVideoRef.current || !videoRef.current) {
      console.error("::NO_VIDEO_ELEMENTS_FOUND::");
      return;
    }
    if (id) {
      await join(id);
    } else {
      await wait();
    }
    return;
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
        console.info("::USER_MEDIA_ERROR::", err);
        // stop();
        onError?.(err);
        return err;
      });
  };

  const disconnect = useCallback(() => {
    console.info("::ABOUT_TO_DESTROY::", peer);
    if (!peer) return;

    peer.destroy();
  }, [peer]);

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

    disconnect,
    remoteVideoRef,

    peerId,
  };
};
