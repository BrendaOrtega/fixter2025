import { Link } from "react-router";
import type { Course } from "@prisma/client";
import CourseCard from "./CourseCard";

export default function MyCourses({ courses }: { courses: Partial<Course>[] }) {
  return (
    <section>
      <div>
        {!!courses.length && <header my={8}>Todos mis cursos</header>}
        <div flexWrap="wrap" justifyContent="center" gap={8}>
          {courses.map((course, index) => (
            <CourseCard
              key={`${course.title}-${index}`}
              isEnrolled
              {...course}
            />
          ))}
        </div>
      </div>
      {!courses.length && (
        <section
          // bg={useColorModeValue('#fff', '#1c1f25')}
          display="flex"
          flexDir="column"
          alignItems="center"
          p={8}
          borderRadius="xl"
          gap={3}
          textAlign="center"
        >
          <img width="120px" mb="24px" src="/assets/ojo.svg" />
          <header fontSize="2xl">¡Aún no tienes ningún curso!</header>
          <p>
            Compra tu primer curso con{" "}
            <span style={{ color: "#6C9FEF" }}>20% de descuento</span> usando el
            cupón{" "}
          </p>
          <span style={{ fontSize: "40px" }} className="text-gradient">
            COMENZAR20
          </span>
          {variant !== "coupon" && (
            <Link to="/courses">
              <button>ver cursos</button>
            </Link>
          )}
        </section>
      )}
    </section>
  );
}
