import type Peer from "peerjs";
import { create } from "zustand";

export const usePeer = create((set) => ({
  peer: null,
  setPeer: (peer: Peer) => set({ peer }),
}));
