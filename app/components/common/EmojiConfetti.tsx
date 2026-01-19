import { useEffect } from "react";
import JSConfetti from "js-confetti";

const confettiColors = ["#85ddcb", "#19262a", "#37ab93"];
const initial = ["🎉", "👾", "💿", "🚀", "📖", "🕹", "📺"];
export const EmojiConfetti = ({
  emojis = initial,
  colors,
  small = false,
}: {
  colors?: boolean;
  emojis?: boolean | string[];
  small?: boolean;
}) => {
  useEffect(() => {
    const jsConfetti = new JSConfetti();

    if (emojis) {
      jsConfetti.addConfetti({
        emojis: Array.isArray(emojis) ? emojis : initial,
        confettiNumber: small ? 80 : 100,
        emojiSize: small ? 50 : 100,
      });
      setTimeout(() => {
        jsConfetti.addConfetti({
          emojis: Array.isArray(emojis) ? emojis : initial,
          confettiNumber: small ? 70 : 80,
          emojiSize: small ? 50 : 100,
        });
      }, 2000);
      return;
    }
    jsConfetti.addConfetti({
      confettiColors: colors ? undefined : confettiColors,
    });
    setTimeout(() => {
      jsConfetti.addConfetti({
        confettiColors: colors ? undefined : confettiColors,
      });
    }, 3000);
  }, []);

  return null;
};
