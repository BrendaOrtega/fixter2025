import { Link } from "react-router";

export const PrimaryButton = ({
  title,
  link,
}: {
  title?: string;
  link?: string;
}) => {
  return (
    <Link to={link ? link : "/cursos"}>
      <button className="h-12 rounded-full border-[2px] border-brand-500 text-brand-500 px-5">
        {title ? title : "Explorar cursos"}
      </button>
    </Link>
  );
};
