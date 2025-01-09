import {
  useForm,
  type RegisterOptions,
  type UseFormRegister,
} from "react-hook-form";
import { cn } from "~/utils/cn";
import { useEffect, useState, type FormEvent } from "react";
import Spinner from "../common/Spinner";
import { FaTrash } from "react-icons/fa6";
import { useFetcher, useSubmit } from "react-router";
import type { Course, Video } from "@prisma/client";
import { Drawer } from "../viewer/SimpleDrawer";

export const CourseForm = ({
  course = {},
  onDirty,
  onSubmit,
}: {
  onSubmit?: () => void;
  onDirty?: (arg0: boolean) => void;
  course: Partial<Course>;
}) => {
  const fetcher = useFetcher<typeof action>();
  const {
    handleSubmit,
    register,
    formState: { isDirty },
  } = useForm({
    defaultValues: {
      title: course.title,
      id: course.id,
      published: course.published,
      isFree: course.isFree,
      icon: course.icon,
    },
  });

  useEffect(() => {
    onDirty?.(isDirty);
  }, [isDirty]);

  const submitHandler = (values: Partial<Course>) => {
    // @todo create new
    if (!values.id) return;
    fetcher.submit(
      {
        intent: "admin_update_course",
        data: JSON.stringify(values),
      },
      { method: "POST", action: "/api/course" }
    );
    onSubmit?.();
  };

  const addVideo = () => {
    setShow(true);
  };

  useEffect(() => {
    if (!course.id) return;
    fetcher.submit(
      { intent: "admin_get_videos_for_course", courseId: course.id },
      {
        method: "POST",
        action: "/api/course",
      }
    );
  }, []);

  const videos: Video[] = fetcher.data?.videos || [];
  const isLoading = fetcher.state !== "idle";

  const [show, setShow] = useState(false);

  const onVideoFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const form = Object.fromEntries(fd);
    form.courseIds = [course.id]; // @todo improve

    // edit
    if (editingVideo) {
      fetcher.submit(
        {
          intent: "admin_update_video",
          data: JSON.stringify({ ...form, id: editingVideo.id }),
        },
        { method: "POST", action: "/api/course" }
      );
      setShow(false);
      onSubmit?.();
      return;
    }

    // validation @todo
    if (form.title && form.storageLink) {
      // submit
      fetcher.submit(
        { intent: "admin_add_video", data: JSON.stringify(form) },
        { method: "POST", action: "/api/course" }
      );
      setShow(false);
      location.reload(); // @todo
    } else {
      alert("Checa los datos");
    }
  };

  const [editingVideo, setEditingVideo] = useState<Partial<Video>>();
  const onVideoClick = (vid: Partial<Video>) => {
    setShow(true);
    setEditingVideo(vid);
  };

  const handleVideoFormClose = () => {
    setShow(false);
    setEditingVideo(undefined);
  };

  return (
    <>
      <Drawer
        isOpen={show}
        cta={<></>}
        title="Nuevo video"
        onClose={handleVideoFormClose}
      >
        {/* Video form */}
        <fetcher.Form
          onSubmit={onVideoFormSubmit}
          className="flex flex-col h-full"
        >
          <Input
            label="Índice"
            className="w-20"
            name="index"
            placeholder="índice"
            defaultValue={
              (editingVideo?.index == "0" ? "0" : editingVideo?.index) ||
              videos.length ||
              "0"
            }
          />
          <Input
            defaultValue={editingVideo?.title}
            label="Título"
            name="title"
            placeholder="Título del video"
          />
          <Input
            defaultValue={editingVideo?.storageLink}
            label="Link"
            name="storageLink"
            placeholder="Link del video"
          />
          <Input
            defaultValue={editingVideo?.duration}
            label="Duración en segundos"
            name="duration"
            placeholder="360"
          />
          <Input
            defaultValue={editingVideo?.moduleName}
            label="Nombre del módulo"
            name="moduleName"
            placeholder="Módulo ..."
          />
          <CheckBox
            defaultChecked={editingVideo?.isPublic}
            label="Es gratis"
            name="isPublic"
          />
          <Input
            label="Descripción"
            name="description"
            placeholder="Markdown"
            type="textarea"
            defaultValue={editingVideo?.description}
          />
          <Input
            label="Nombre del autor"
            name="authorName"
            placeholder="blissmo"
            defaultValue={"Héctorbliss"}
            defaultValue={editingVideo?.authorName}
          />
          <Input
            defaultValue={editingVideo?.photoUrl}
            label="Foto del autor"
            name="photoUrl"
            className="mb-10"
          />
          <button
            type="submit"
            className={cn(
              "bg-black mt-auto border rounded-xl py-3 font-bold text-2xl hover:bg-gray-900 active:bg-black",
              "absolute bottom-0 left-0 right-0"
            )}
          >
            Guardar
          </button>
        </fetcher.Form>
      </Drawer>
      <fetcher.Form onSubmit={handleSubmit(submitHandler)}>
        <Input
          placeholder="Título"
          label="Título del curso"
          register={register}
          name="title"
        />
        <CheckBox label="Es gratis" name="isFree" register={register} />
        <CheckBox label="Publicado" name="published" register={register} />
        <Input
          placeholder="pega un link"
          label="Icono del curso"
          register={register}
          name="icon"
        />
        <button
          type="button"
          onClick={addVideo}
          className="border border-gray-500 rounded-lg p-2 hover:border-gray-100 hover:shadow-md active:border-gray-500"
        >
          Añadir video +{" "}
        </button>
        {isLoading ? (
          <Spinner />
        ) : (
          <div>
            {videos.map((video) => (
              <VideoCard
                video={video}
                key={video.id}
                onClick={() => onVideoClick(video)}
              />
            ))}
          </div>
        )}
        <hr className="my-10 border-none" />
        <button
          type="submit"
          className={cn(
            "bg-black mt-auto border rounded-xl py-3 font-bold text-2xl hover:bg-gray-900 active:bg-black",
            "absolute bottom-0 left-0 right-0"
          )}
        >
          Guardar
        </button>
      </fetcher.Form>
    </>
  );
};

const CheckBox = ({
  name,
  label,
  error,
  placeholder,
  register,
  registerOptions,
  defaultChecked,
}: {
  defaultChecked?: boolean;
  registerOptions?: RegisterOptions;
  register?: (arg0: any, arg1: any) => Object;
  placeholder?: string;
  name?: string;
  error?: string;
  label?: string;
}) => {
  return (
    <>
      <label className="cursor-pointer mb-1 border rounded p-3 block">
        <div className="flex justify-between items-center">
          <span className="select-none">{label}</span>
          <input
            placeholder={placeholder}
            name={name}
            className="text-brand-700 focus:ring-brand-500"
            type="checkbox"
            defaultChecked={defaultChecked}
            {...register?.(name, registerOptions)}
          />
        </div>
        <p>{error}</p>
      </label>
    </>
  );
};

const VideoCard = ({
  video,
  onTrashClick,
  onClick,
}: {
  onClick?: () => void;
  onTrashClick?: () => void;
  video: Partial<Video>;
}) => {
  const fetcher = useFetcher();
  const confirmDeletion = () => {
    if (!confirm("Esto no es reversible")) return;
    fetcher.submit(
      {
        intent: "admin_delete_video",
        videoId: video.id as string,
      },
      { method: "DELETE", action: "/api/course" }
    );
    onTrashClick?.();
  };

  return (
    <div
      role="button"
      onClick={onClick}
      className="flex my-2 rounded-xl p-3 border relative gap-4 group"
    >
      <img
        className="w-40 rounded-lg"
        src={video.poster || "/cover.png"}
        alt="poster"
      />
      <button
        onClick={confirmDeletion}
        className={cn(
          "invisible group-hover:visible absolute top-4 right-6",
          "hover:scale-110 active:scale-100"
        )}
      >
        <FaTrash />
      </button>
      <div className="grid">
        <div>
          <h3 className="">{video.title}</h3>
          <p className="text-xs">
            Módulo: <strong>{video.moduleName}</strong>
          </p>
        </div>
        <p className="text-xs">
          Índice: <strong className="text-xl">{video.index}</strong>
        </p>
        <p className="text-xs truncate">{video.storageLink}</p>
      </div>
    </div>
  );
};

export const Input = ({
  error,
  label,
  placeholder,
  register,
  registerOptions = {},
  name,
  className,
  type = "text",
  defaultValue,
}: {
  defaultValue?: string | number | null;
  type?: "text" | "textarea";
  name: string;
  registerOptions?: RegisterOptions;
  register?: UseFormRegister<{ [x: string]: string }>; // @todo fix it
  placeholder?: string;
  error?: string;
  label?: string;
  className?: string;
}) => {
  const Element = type === "textarea" ? "textarea" : "input";
  return (
    <label className="grid gap-2 mb-px text-white">
      <span>{label}</span>
      <Element
        defaultValue={defaultValue || undefined}
        placeholder={placeholder}
        className={cn("rounded-lg text-black", className)}
        type={type}
        name={name}
        {...register?.(name, registerOptions)}
      />
      <p>{error}</p>
    </label>
  );
};
