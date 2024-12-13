import { useAnimationFrame, motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "~/utils/cn";
import { useScrollVelocityFactor } from "../hooks/useScrollVelocityFactor";

type Mode = "fast" | "normal" | "slow";

const noop = () => false;

const shuffle = (images: string[]) => {
  const randomized: string[] = [];
  const list = Array.from(images);
  images.forEach(() => {
    const randomIndex = Math.floor(Math.random() * list.length);
    randomized.push(list.splice(randomIndex, 1)[0]);
  });
  return [...randomized];
};

export const JackPotSection = ({
  images,
  mode = "fast",
}: {
  images: string[];
  mode?: Mode;
}) => {
  return (
    <section className="bg-transparent w-full -my-4  -z-10 overflow-hidden">
      <main className="flex justify-evenly h-[400px] md:h-[900px] -my-10 gap-4 md:gap-8">
        <Roll mode={mode} reversed srcset={images} />
        <Roll mode={mode} srcset={shuffle(images)} />
        <Roll reversed mode={mode} srcset={shuffle(images)} />
        <Roll srcset={shuffle(images)} mode={mode} />
      </main>
    </section>
  );
};

const Roll = ({
  srcset,
  reversed,
  stop,
  mode,
}: {
  mode?: Mode;
  stop?: true;
  reversed?: boolean;
  srcset?: string[];
}) => {
  const ref = useRef<HTMLElement>(null);
  const heightRef = useRef(0);

  // scroll
  const velocityFactor = useScrollVelocityFactor(mode);

  // movement
  const y = useMotionValue(0);
  const loop = () => {
    if (!ref.current) return;
    y.set(y.get() + (reversed ? 1 : -1) * velocityFactor.get());
    // reset
    if (Math.abs(y.get()) > heightRef.current / 2) {
      y.set(0);
    }
  };
  useAnimationFrame(stop ? noop : loop);
  //

  // save height (to do it once, only)
  useEffect(() => {
    if (ref.current) {
      heightRef.current = ref.current.getBoundingClientRect().height;
    }
  }, []);

  return (
    <motion.nav
      ref={ref}
      style={{ y }}
      className={cn("flex flex-col gap-6 md:gap-20 h-max py-10", {
        "self-end": reversed,
      })}
    >
      {srcset?.map((src) => (
        <img className={cn("w-[120px] p-2")} key={src} src={src} alt="demo" />
      ))}
      {srcset?.map((src) => (
        <img
          // ref={scope}
          className={cn("w-[120px] p-2")}
          key={src}
          src={src}
          alt="demo"
        />
      ))}
    </motion.nav>
  );
};
