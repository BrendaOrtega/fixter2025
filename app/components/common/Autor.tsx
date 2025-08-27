import type { Post } from "@prisma/client";

export const Autor = ({
  photoUrl,
  authorName,
  authorAtLink,
  authorAt,
}: Partial<Post>) => {
  const fallbackPic = "/full-logo.svg";

  return (
    <div className="inline-flex gap-2 items-center rounded-full py-2 px-3 bg-gray-800/70 self-center md:self-start mr-8">
      <img
        width="40px"
        src={photoUrl || fallbackPic}
        alt="author photo"
        className="rounded-full border-2 border-brand-700"
      />
      <div className="">
        <h3 className="text-sm text-[#4D5562] dark:text-[#A3A8B0] font-semibold">
          {authorName}
        </h3>
        <a
          className="text-xs"
          rel="noreferrer"
          target="_blank"
          href={authorAtLink || "https://www.linkedin.com/company/fixtergeek/"}
        >
          <span className="text-sm text-[#4D5562] dark:text-[#A3A8B0] font-mono">
            {authorAt}
          </span>
        </a>
      </div>
    </div>
  );
};
