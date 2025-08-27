import { data, type LoaderFunctionArgs, redirect } from "react-router";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getReadURL } from "~/.server/tigrs";

// @todo members only?
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserOrRedirect(request); // auth only
  // @todo check for permissions
  const url = new URL(request.url);
  const storageKey = url.searchParams.get("storageKey");
  if (!storageKey) throw data(null, { status: 404 });
  //   console.log("DELIVERING file for: ", storageKey);
  const readURL = await getReadURL(storageKey);
  return redirect(readURL);
};
