import { db } from "~/.server/db";
import { redirect } from "react-router";
import type { Route } from "../+types/cursos";
import type { Course } from "@prisma/client";
import { useState } from "react";
import { Drawer } from "~/components/viewer/SimpleDrawer";
import { CourseForm } from "~/components/forms/CourseForm";

export const action = async ({ request }: Route.ActionArgs) => {
  const intent = (await request.formData()).get("intent");
  if (intent === "new") {
    const newCourse = await db.course.create({
      data: {
        title: "Nuev curso",
        slug: "nuevo-curso-" + Date.now(),
      },
    });
    throw redirect("/admin/cursos/" + newCourse.id);
  }
  return null;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  // await getAdminOrRedirect(request, { next: "/admin/cursos" });

  const courses = await db.course.findMany({ orderBy: { updatedAt: "desc" } });
  return { courses };
};

export default function Page({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;
  const [current, setCurrent] = useState<Partial<Course>>();
  const [show, setShow] = useState(false);
  const [isDirty, setDirty] = useState(false);

  const onCourseSelect = (course: Partial<Course>) => {
    setCurrent(course);
    setShow(true);
  };

  const onClose = () => {
    setShow(false);
    setCurrent(undefined);
  };

  const handleDirty = () => {
    if (!confirm("Si cierras ahora, se perderá lo que has escrito")) return;
    onClose();
    setDirty(false);
  };

  return (
    <>
      <Drawer
        mode="big"
        cta={<></>}
        onClose={isDirty ? handleDirty : onClose}
        title="Administra el curso"
        isOpen={show}
      >
        <CourseForm
          onDirty={(dirty) => setDirty(dirty)}
          course={current || {}}
          onSubmit={onClose}
        />
      </Drawer>
      <article className="px-6 py-20 text-white bg-gray-800">
        <nav className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Administra los cursos</h1>
          <button
            onClick={() => onCourseSelect({})}
            type="button"
            className="hover:shadow-md hover:bg-indigo-600 py-2 px-4 bg-indigo-500 rounded-lg shadow text-white"
          >
            Nuevo +
          </button>
        </nav>
        <hr className="my-4" />
        <section className="grid gap-2">
          {courses.map((course) => (
            <CourseCard
              onClick={() => onCourseSelect(course)}
              course={course}
              key={course.id}
            />
          ))}
        </section>
      </article>
    </>
  );
}

export const CourseCard = ({
  course,
  onClick,
}: {
  onClick?: () => void;
  course: Partial<Course>;
}) => {
  return (
    <button
      onClick={onClick}
      className="py-2 px-4 shadow border border-gray-300 rounded-lg hover:shadow-md text-left hover:bg-gray-900 flex justify-between items-center"
    >
      <h3>{course.title}</h3>
      <div className="flex gap-1">
        {course.isFree && (
          <p className="text-xs py-[1px] px-1 bg-green-500 text-white rounded-lg">
            Gratis
          </p>
        )}
        {course.published ? (
          <p className="text-xs py-[1px] px-1 bg-blue-200 text-blue-400 rounded-lg">
            Activo
          </p>
        ) : (
          <p className="text-xs py-[1px] px-1 bg-gray-200 text-gray-400 rounded-lg">
            Draft
          </p>
        )}
      </div>
    </button>
  );
};
