import { useEffect } from "react";
import JSConfetti from "js-confetti";

const confettiColors = ["#85ddcb", "#19262a", "#37ab93"];
const initial = ["🎉", "👾", "💿", "🚀", "📖", "🕹", "📺"];
export const EmojiConfetti = ({
  emojis = initial,
  colors,
  small = false,
  // tamaño explícito en px; gana sobre `small`
  emojiSize,
}: {
  colors?: boolean;
  emojis?: boolean | string[];
  small?: boolean;
  emojiSize?: number;
}) => {
  useEffect(() => {
    const jsConfetti = new JSConfetti();
    const size = emojiSize ?? (small ? 50 : 100);

    if (emojis) {
      jsConfetti.addConfetti({
        emojis: Array.isArray(emojis) ? emojis : initial,
        confettiNumber: small ? 80 : 100,
        emojiSize: size,
      });
      setTimeout(() => {
        jsConfetti.addConfetti({
          emojis: Array.isArray(emojis) ? emojis : initial,
          confettiNumber: small ? 70 : 80,
          emojiSize: size,
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
