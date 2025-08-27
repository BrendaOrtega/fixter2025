import { useNavigate } from "react-router";

export default function useURLSearch(search?: string) {
  const navigate = useNavigate();

  const find = ({
    tag = "",
    url,
    onUpdate,
  }: {
    tag: string;
    url: URL;
    onUpdate?: (arg0: string) => void;
  }): void => {
    // find... a better name. But t'is nice, for now.
    if (tag === search) {
      url.searchParams.delete("search");
      onUpdate?.("");
    } else {
      url.searchParams.set("search", tag);
      onUpdate?.(tag);
    }
    navigate({
      pathname: url.pathname,
      search: url.search,
    });
  };

  return {
    find,
    // @todo any loading artifact or state?
  };
}
