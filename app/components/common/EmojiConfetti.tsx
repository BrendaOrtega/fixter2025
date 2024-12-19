import { useEffect } from "react";
import JSConfetti from "js-confetti";

const confettiColors = ["#85ddcb", "#19262a", "#37ab93"];
const initial = ["🎉", "👾", "💿", "🚀", "📖", "🕹", "📺"];
export const EmojiConfetti = ({
  emojis = initial,
}: {
  emojis?: boolean | string[];
}) => {
  useEffect(() => {
    const jsConfetti = new JSConfetti();

    if (emojis) {
      jsConfetti.addConfetti({
        emojis: Array.isArray(emojis) ? emojis : initial,
      });
      setTimeout(() => {
        jsConfetti.addConfetti({
          emojis: Array.isArray(emojis) ? emojis : initial,
        });
      }, 2000);
      return;
    }
    jsConfetti.addConfetti({
      confettiColors,
    });
    setTimeout(() => {
      jsConfetti.addConfetti({
        confettiColors,
      });
    }, 2000);
  }, []);

  return null;
};
