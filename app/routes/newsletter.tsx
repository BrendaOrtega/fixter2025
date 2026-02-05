import { redirect } from "react-router";

export const loader = async () => {
  throw redirect("/newsletters", 301);
};

export default function Newsletter() {
  return null;
}
