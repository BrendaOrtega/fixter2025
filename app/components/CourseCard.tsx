import { Link } from "react-router";
import type { Course } from "@prisma/client";
import { useVideosLength } from "~/hooks/useVideosLength";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { use3DHover } from "~/hooks/use3DHover";
import { formatDuration } from "~/routes/cursos";
import { useRef } from "react";

export const CourseCard = ({
  course,
  to,
  courseSlug,
}: {
  to?: string;
  course: Partial<Course>;
  courseSlug?: string;
}) => {
  const isProximamente = course.tipo === "proximamente";
  const videosLength = useVideosLength(course.id);
  const z = useSpring(0, { bounce: 0 });
  const {
    containerRef,
    springX,
    springY,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
  } = use3DHover({
    onMouseEnter: () => {
      z.set(30);
    },
    onMouseLeave: () => {
      z.set(0);
    },
  });
  const textZ = useTransform(z, [0, 30], [0, 40]);
  const imgZ = useTransform(z, [0, 30], [0, 50]);
  const ref = useRef(null);
  const isInview = useInView(ref, { once: true });

  const Wrapper = isProximamente ? "div" : Link;
  const wrapperProps = isProximamente
    ? { className: "grid-cols-1 relative w-full h-[480px] cursor-not-allowed" }
    : { to: to || `/cursos/${course.slug}/detalle`, className: "grid-cols-1 relative w-full h-[480px]" };

  return (
    <Wrapper
      {...wrapperProps as any}
      style={{
        transformStyle: "preserve-3d",
        perspective: 900,
        opacity: isInview ? 1 : 0.8,
        scale: isInview ? 1 : 0.7,
        transform: isInview ? "translateY(0px)" : " translateY(40px)",
        transition: "all 1s ease",
      }}
      ref={ref}
    >
      {isProximamente && (
        <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          PRÓXIMAMENTE
        </div>
      )}
      <motion.div
        style={{
          rotateX: springX,
          rotateY: springY,
          transformStyle: "preserve-3d",
          perspective: 600,
          boxShadow: isProximamente ? "0px 0px 24px 0px #f97316" : "0px 0px 24px 0px #37ab93",
        }}
        ref={containerRef}
        onMouseMove={isProximamente ? undefined : handleMouseMove}
        onMouseEnter={isProximamente ? undefined : handleMouseEnter}
        onMouseLeave={isProximamente ? undefined : handleMouseLeave}
        className={`pt-2 absolute top-0 rounded-3xl border bg-cover border-white/20 bg-card w-full h-full ${isProximamente ? "opacity-80" : ""}`}
      >
        <motion.img
          style={{ z: imgZ }}
          className="mx-auto h-60 "
          src={course.icon || ""}
          alt={course.title}
        />
        <motion.h3
          style={{ z }}
          id="card_title"
          className="font-bold text-2xl text-white mt-8 text-center"
        >
          {course.title}
        </motion.h3>
        <p className="mt-3 text-colorCaption font-light text-center">
          {videosLength} lecciones | {formatDuration(course.duration)}
        </p>
        <motion.div
          style={{ z: textZ }}
          className="flex gap-2 mx-auto justify-center text-center mt-6"
        >
          <p className=" text-brand-500 uppercase">{course.level}</p>
          {course.level === "avanzado" ? (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
            </span>
          ) : course.level === "intermedio" ? (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img className="opacity-25 w-3" src="/thunder.svg" />
            </span>
          ) : (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img className="opacity-25 w-3" src="/thunder.svg" />
              <img className="opacity-25 w-3" src="/thunder.svg" />
            </span>
          )}
        </motion.div>
      </motion.div>
    </Wrapper>
  );
};
