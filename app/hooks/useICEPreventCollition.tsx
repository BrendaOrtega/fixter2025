import { useRef } from "react";

export const useICEPreventCollition = () => {
  let makingOffer = useRef(false);
  let ignoreOffer = useRef(false);
  let isSettingRemoteAnswerPending = useRef(false);

  const setMakingOffer = (bool: boolean) => (makingOffer.current = bool);
  const setIgnoringOffer = (bool: boolean) => (makingOffer.current = bool);
  const setSettingRemoteAnswerPending = (bool: boolean) =>
    (makingOffer.current = bool);

  return {
    setMakingOffer,
    setIgnoringOffer,
    setSettingRemoteAnswerPending,
    makingOffer,
    ignoreOffer,
    isSettingRemoteAnswerPending,
  };
};
