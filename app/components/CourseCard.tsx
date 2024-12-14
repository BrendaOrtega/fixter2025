import { Link } from "react-router";
import type { Course } from "@prisma/client";
import { useVideosLength } from "~/hooks/useVideosLength";
import { motion } from "framer-motion";
import { use3DHover } from "~/hooks/use3DHover";
import { formatDuration } from "~/routes/cursos";

export const CourseCard = ({
  course,
  courseSlug,
  to,
}: {
  to?: string;
  courseSlug: string;
  course: Course;
}) => {
  const videosLength = useVideosLength(course.id);
  const {
    containerRef,
    springX,
    springY,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    isHovered,
  } = use3DHover();
  // @todo add courses route to save seo
  return (
    <Link
      to={to || `/cursos/${courseSlug}/detalle`}
      className="grid-cols-1 relative w-full h-[480px]"
      style={{
        transformStyle: "preserve-3d",
        perspective: 600,
      }}
    >
      {/* {!isHovered && (
        <div className="bg-brand-500/40 blur-xl w-full h-[480px] rounded-3xl" />
      )} */}
      <motion.div
        style={{
          rotateX: springX,
          rotateY: springY,

          boxShadow: " 0px 0px 24px 0px #37ab93",
        }}
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="pt-2 absolute top-0 rounded-3xl border bg-cover border-white/20 bg-card w-full h-full"
      >
        <img className="mx-auto h-60 " src={course.icon} alt={course.title} />
        <h3 className="font-bold text-2xl text-white mt-8 text-center">
          {course.title}
        </h3>
        <p className="mt-3 text-colorCaption font-light text-center">
          {videosLength} lecciones | {formatDuration(course.duration)}
        </p>
        <div className="flex gap-2 mx-auto justify-center text-center mt-6">
          <p className=" text-brand-500 uppercase">{course.level}</p>
          {course.level === "Avanzado" ? (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
            </span>
          ) : (
            <span className="flex gap-2">
              <img src="/thunder.svg" className="w-3" />
              <img src="/thunder.svg" className="w-3" />
              <img className="opacity-25 w-3" src="/thunder.svg" />
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
};
