import { useEffect } from "react";
import JSConfetti from "js-confetti";

const confettiColors = ["#85ddcb", "#19262a", "#37ab93"];

export const EmojiConfetti = ({
  emojis = ["🎉", "👾", "💿", "🚀", "📖", "🕹", "📺"],
}: {
  emojis?: string[] | false;
}) => {
  useEffect(() => {
    const jsConfetti = new JSConfetti();

    if (emojis === false) {
      jsConfetti.addConfetti({
        confettiColors,
      });
      setTimeout(() => {
        jsConfetti.addConfetti({
          confettiColors,
        });
      }, 2000);
      return;
    }

    setTimeout(() => {
      jsConfetti.addConfetti({
        emojis,
      });
    }, 300);
    setTimeout(() => {
      jsConfetti.addConfetti({
        emojis,
      });
    }, 4000);
  }, []);
  return null;
};
