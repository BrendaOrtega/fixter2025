import { useFetcher } from "react-router";
import { Input } from "./CourseForm";
import Spinner from "../common/Spinner";
import type { Post } from "~/types/models";
import { SelectInput } from "./SelectInput";

export const PostForm = ({
  current,
  onCancel,
}: {
  onCancel?: () => void;
  current?: Post | null;
}) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form action="/admin/posts" method="post">
      <input type="hidden" name="slug" defaultValue={current?.slug} />
      <div className="flex gap-2">
        <Input
          defaultValue={current?.title}
          label="Título"
          name="title"
          placeholder="Un título pegajoso"
        />
        <Input
          defaultValue={current?.tags}
          label="Tags"
          name="tags"
          placeholder="separa, con comas, así"
        />
      </div>
      <div className="flex gap-2">
        <Input
          defaultValue={current?.youtubeLink}
          label="Video"
          name="youtubeLink"
          placeholder="http://youtu.be/3j38DFGr"
        />
        <Input
          defaultValue={current?.metaImage}
          label="Imagen"
          name="metaImage"
          placeholder="http://image.be/3j38DFGr"
        />
      </div>
      <SelectInput
        name="author"
        className="w-[220px]"
        label="Autor"
        options={[
          { value: "bliss", label: "Bliss" },
          { value: "brendi", label: "Brendi" },
        ]}
      />
      <Input
        defaultValue={current?.body}
        label="Cuerpo"
        type="textarea"
        name="body"
        className="h-[200px]"
        placeholder="Échale crema decía papá"
      />
      <nav className="flex mt-auto">
        <button
          onClick={onCancel}
          type="button"
          className="py-3 px-6 rounded-2xl border bg-gray-200 text-black ml-auto"
        >
          Cancelar
        </button>
        <button
          name="intent"
          value="save_post"
          type="submit"
          className="ml-4 block border rounded-2xl py-3 px-6 active:scale-95 hover:shadow"
        >
          {fetcher.state !== "idle" ? <Spinner /> : "  Guardar"}
        </button>
      </nav>
    </fetcher.Form>
  );
};
