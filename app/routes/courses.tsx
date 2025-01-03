import { redirect, type LoaderFunctionArgs } from "react-router";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace("courses", "cursos");
  return redirect(url.toString());
};
