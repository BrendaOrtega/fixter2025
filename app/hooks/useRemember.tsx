import { useEffect, useState } from "react";

export const useRemember = () => {
  const KEY = "avoid_suscription_prompt";
  const [avoid, setAvoid] = useState(false);
  const avoidForDays = (days: number, key: string = KEY) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const msString = `${d.getTime()}`;
    localStorage.setItem(key, msString);
    shouldAvoid();
  };

  const avoidForSecs = (secs: number, key: string = KEY) => {
    const d = new Date();
    d.setSeconds(d.getSeconds() + secs);
    const msString = `${d.getTime()}`;
    localStorage.setItem(key, msString);
    shouldAvoid();
  };

  const shouldAvoid = (key: string = KEY) => {
    const string = localStorage.getItem(key);
    if (!string) return false;

    const time = Number(string);
    const avoid = Date.now() < time;
    setAvoid(avoid);
    return avoid;
  };

  useEffect(() => {
    shouldAvoid();
  }, []);

  return {
    avoid,
    avoidForDays,
    avoidForSecs,
    shouldAvoid,
  };
};
