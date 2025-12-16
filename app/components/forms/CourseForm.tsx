import {
  useForm,
  type RegisterOptions,
  type UseFormRegister,
} from "react-hook-form";
import { cn } from "~/utils/cn";
import { VideoPreview } from "~/components/viewer/VideoPreview";
import { useEffect, useState, type FormEvent, useRef } from "react";
import Spinner from "../common/Spinner";
import { FaTrash, FaUpload } from "react-icons/fa6";
import { FaExclamationCircle, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { useFetcher, useSubmit } from "react-router";
import type { Course, Video } from "~/types/models";
import { Drawer } from "../viewer/SimpleDrawer";

// Component to show video processing status
const VideoProcessingStatus = ({ videoId, course }: { videoId: string; course: Partial<Course> }) => {
  const fetcher = useFetcher();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Check status on mount and periodically
    const checkStatus = () => {
      fetcher.submit(
        { intent: "get_video_status", videoId },
        { method: "POST", action: "/api/course" }
      );
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [videoId]);

  useEffect(() => {
    if (fetcher.data && fetcher.data.success) {
      setStatus(fetcher.data.status);
      // Debug: log response data
      console.log("🔍 VideoProcessingStatus - Response data:", {
        status: fetcher.data.status,
        hasHLS: fetcher.data.hasHLS,
        hasDirectLink: fetcher.data.hasDirectLink,
        directLink: fetcher.data.directLink,
        directLinkPresigned: fetcher.data.directLinkPresigned,
        hlsUrl: fetcher.data.hlsUrl
      });
    }
  }, [fetcher.data, status, videoId]);

  if (!status || status === "unknown") return null;

  const statusConfig = {
    pending: {
      icon: FaSpinner,
      text: "Video pendiente de procesamiento",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    processing: {
      icon: FaSpinner,
      text: "Procesando video a HLS...",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      animate: true,
    },
    ready: {
      icon: FaCheckCircle,
      text: "Video listo para reproducción",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    failed: {
      icon: FaExclamationCircle,
      text: fetcher.data?.error || "Error en procesamiento",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  }[status];

  if (!statusConfig) return null;

  const Icon = statusConfig.icon;

  return (
    <div className={`p-3 rounded-lg mb-4 ${statusConfig.bg}`}>
      <div className={`flex items-center gap-2 ${statusConfig.color}`}>
        <Icon className={statusConfig.animate ? "animate-spin" : ""} />
        <span className="text-sm">{statusConfig.text}</span>
      </div>
      
      {/* Preview del video como lo verá el usuario */}
      {(fetcher.data?.hasHLS || fetcher.data?.hasDirectLink) && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">
            📹 Preview (como lo verá el usuario):
          </p>
          <VideoPreview 
            video={{
              m3u8: fetcher.data?.hlsUrl,
              storageLink: fetcher.data?.directLinkPresigned || fetcher.data?.directLink
            }}
            courseId={course?.id || ""}
          />
        </div>
      )}
      
      {fetcher.data?.hasHLS && (
        <p className="text-xs text-gray-400 mt-1">✅ HLS disponible</p>
      )}
      {fetcher.data?.hasDirectLink && (
        <p className="text-xs text-gray-400">✅ Video directo disponible</p>
      )}
      
      {/* Botón para limpiar archivos S3 */}
      {(fetcher.data?.hasDirectLink || fetcher.data?.hasHLS) && (
        <button
          type="button"
          onClick={() => {
            if (confirm("¿Estás seguro de eliminar todos los archivos de video (original + HLS)? Esto no se puede deshacer.")) {
              fetcher.submit(
                { intent: "delete_video_files", videoId },
                { method: "POST", action: "/api/course" }
              );
            }
          }}
          className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
        >
          🗑️ Eliminar archivos S3
        </button>
      )}
    </div>
  );
};

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
      title: course?.title || "",
      id: course?.id || "",
      published: course?.published || false,
      isFree: course?.isFree || false,
      icon: course?.icon || "",
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
    if (!course?.id) return;
    fetcher.submit(
      { intent: "admin_get_videos_for_course", courseId: course?.id || "" },
      {
        method: "POST",
        action: "/api/course",
      }
    );
  }, []);

  const videos: Video[] = fetcher.data?.videos || [];
  const isLoading = fetcher.state !== "idle";

  const [show, setShow] = useState(false);

  const [pendingVideoAction, setPendingVideoAction] = useState<
    "add" | "edit" | null
  >(null);

  const onVideoFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVideoErrors({});

    const fd = new FormData(event.currentTarget);
    const form = Object.fromEntries(fd);
    form.courseIds = [course?.id || ""];

    // Validación frontend
    const errors: Record<string, string> = {};
    if (!form.title || String(form.title).trim() === "") {
      errors.title = "El título es requerido";
    }

    if (Object.keys(errors).length > 0) {
      setVideoErrors(errors);
      return;
    }

    // edit
    if (editingVideo) {
      setPendingVideoAction("edit");
      fetcher.submit(
        {
          intent: "admin_update_video",
          data: JSON.stringify({ ...form, id: editingVideo.id }),
        },
        { method: "POST", action: "/api/course" }
      );
      return;
    }

    // crear nuevo
    setPendingVideoAction("add");
    fetcher.submit(
      { intent: "admin_add_video", data: JSON.stringify(form) },
      { method: "POST", action: "/api/course" }
    );
  };

  // Manejar respuesta del servidor para videos
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && pendingVideoAction) {
      const response = fetcher.data as {
        success?: boolean;
        errors?: Record<string, string>;
      };

      if (response.success === false && response.errors) {
        setVideoErrors(response.errors);
        setPendingVideoAction(null);
        return;
      }

      // Éxito - cerrar y refrescar lista
      if (response.success === true || (response as any).video) {
        setShow(false);
        setEditingVideo(undefined);
        setPendingVideoAction(null);
        // Refrescar lista de videos
        if (course?.id) {
          fetcher.submit(
            { intent: "admin_get_videos_for_course", courseId: course?.id || "" },
            { method: "POST", action: "/api/course" }
          );
        }
      }
    }
  }, [fetcher.state, fetcher.data, pendingVideoAction]);

  const [editingVideo, setEditingVideo] = useState<Partial<Video>>();
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onVideoClick = (vid: Partial<Video>) => {
    setShow(true);
    setEditingVideo(vid);
  };

  const handleVideoFormClose = () => {
    setShow(false);
    setEditingVideo(undefined);
    setVideoErrors({});
    setPendingVideoAction(null);
    setVideoFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Handle video file upload to S3
  const handleVideoUpload = async (file?: File) => {
    const uploadFile = file || videoFile;
    if (!uploadFile) {
      setVideoErrors({ _form: "Por favor selecciona un archivo de video" });
      return;
    }
    
    // For new videos, we need to save first to get an ID
    if (!editingVideo?.id) {
      setVideoErrors({ 
        _form: "Primero guarda el video con el botón 'Guardar' para obtener un ID, luego sube el archivo" 
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Get presigned URL from backend using fetch directly
      const formData = new FormData();
      formData.append('intent', 'get_video_upload_url');
      formData.append('videoId', editingVideo.id);
      formData.append('fileName', uploadFile.name);
      
      const response = await fetch('/api/course', {
        method: 'POST',
        body: formData
      });
      
      const urlData = await response.json();
      
      if (!urlData?.success) {
        throw new Error(urlData?.error || "Error obteniendo URL de subida");
      }

      setUploadProgress(30);

      // Step 2: Upload file directly to S3
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 70) + 30;
          setUploadProgress(percentComplete);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", urlData.uploadUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.type || "video/mp4");
        xhr.send(uploadFile);
      });

      setUploadProgress(100);

      // Step 3: Confirm upload and start processing
      const confirmData = new FormData();
      confirmData.append('intent', 'confirm_video_upload');
      confirmData.append('videoId', editingVideo.id);
      confirmData.append('s3Key', urlData.key);
      
      await fetch('/api/course', {
        method: 'POST',
        body: confirmData
      });

      // Success feedback
      setTimeout(() => {
        setIsUploading(false);
        setVideoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);

    } catch (error) {
      console.error("Error uploading video:", error);
      setVideoErrors({ 
        _form: error instanceof Error ? error.message : "Error al subir el video" 
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
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
        {videoErrors._form && (
          <p className="text-red-500 text-sm mb-2 p-2 bg-red-500/10 rounded">
            {videoErrors._form}
          </p>
        )}
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
              editingVideo?.index?.toString() ||
              videos.length.toString() ||
              "0"
            }
          />
          <Input
            defaultValue={editingVideo?.title}
            label="Título"
            name="title"
            placeholder="Título del video"
            error={videoErrors.title}
          />
          
          {/* Video Upload Section */}
          {editingVideo?.id ? (
            <>
              <div className="mb-4 p-4 border border-gray-600 rounded-lg bg-gray-800/50">
                <label className="block text-sm font-medium mb-2">
                  📹 Subir Video (MP4)
                </label>
                
                {/* File input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoFile(file);
                      setUploadProgress(0);
                      // Auto-upload when file is selected
                      await handleVideoUpload(file);
                    }
                  }}
                  className="hidden"
                />
                
                {/* Upload UI */}
                {!videoFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <FaUpload className="text-2xl text-gray-400" />
                    <span className="text-sm text-gray-300">Click para seleccionar video</span>
                    <span className="text-xs text-gray-500">MP4 o MOV (máx 2GB)</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <span className="text-sm truncate flex-1">{videoFile.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    {(isUploading || uploadProgress > 0) && (
                      <div className="space-y-1">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-gray-400">
                          {isUploading ? `Subiendo... ${uploadProgress}%` : '✅ Video subido'}
                        </p>
                      </div>
                    )}
                    
                    {/* Status or change button */}
                    {!isUploading ? (
                      uploadProgress === 100 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setUploadProgress(0);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-gray-400 hover:text-gray-300 text-center w-full"
                        >
                          Seleccionar otro archivo
                        </button>
                      ) : (
                        <p className="text-xs text-center text-yellow-400">
                          ⚠️ El archivo se subirá automáticamente
                        </p>
                      )
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Processing Status */}
              <VideoProcessingStatus videoId={editingVideo.id} course={course} />
            </>
          ) : (
            <div className="mb-4 p-4 border border-yellow-600 rounded-lg bg-yellow-600/10">
              <p className="text-sm text-yellow-300">
                ⚠️ Primero guarda el video para poder subir el archivo MP4
              </p>
            </div>
          )}
          
          {/* Legacy fields (hidden when uploading) */}
          {!videoFile && (
            <>
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  Enlaces manuales (opcional)
                </summary>
                <div className="mt-2 space-y-2">
                  <Input
                    defaultValue={editingVideo?.storageLink}
                    label="Link directo"
                    name="storageLink"
                    placeholder="https://..."
                  />
                  <Input
                    defaultValue={editingVideo?.m3u8}
                    label="Playlist HLS"
                    name="m3u8"
                    placeholder="https://.../master.m3u8"
                  />
                </div>
              </details>
            </>
          )}
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
            disabled={pendingVideoAction !== null || isUploading}
            className={cn(
              "bg-black mt-auto border rounded-xl py-3 font-bold text-2xl hover:bg-gray-900 active:bg-black",
              "absolute bottom-0 left-0 right-0",
              (pendingVideoAction !== null || isUploading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading 
              ? `Subiendo video... ${uploadProgress}%`
              : pendingVideoAction !== null 
              ? "Guardando..." 
              : "Guardar"
            }
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
          disabled={isUploading}
          className={cn(
            "bg-black mt-auto border rounded-xl py-3 font-bold text-2xl hover:bg-gray-900 active:bg-black",
            "absolute bottom-0 left-0 right-0",
            isUploading && "opacity-50 cursor-not-allowed bg-gray-600"
          )}
        >
          {isUploading ? `Subiendo video... ${uploadProgress}%` : "Guardar"}
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
    <label className="grid gap-2 mb-px text-white w-full">
      <span>{label}</span>
      <Element
        defaultValue={defaultValue || undefined}
        placeholder={placeholder}
        className={cn(
          "rounded-lg text-black",
          error && "ring-2 ring-red-500 border-red-500",
          className
        )}
        type={type}
        name={name}
        {...register?.(name, registerOptions)}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </label>
  );
};
