import { useEffect, useState } from "react";
import Markdown from "../common/Markdown";
import { MenuButton, MenuListContainer } from "./VideoPlayerMenu";
import { cn } from "~/utils/cn";
import { useSpring } from "motion/react";
import { BsMarkdown } from "react-icons/bs";

export const MarkdownViewer = ({ body }: { body?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const x = useSpring(0);
  useEffect(() => {
    if (isOpen) {
      x.set(0);
    } else {
      x.set(-900);
    }
  }, [isOpen]);
  return (
    <article className="">
      <MenuButton
        className="top-16 left-0 absolute z-10"
        isOpen={isOpen}
        icon={<BsMarkdown />}
        x={isOpen ? -100 : 0}
        onToggle={() => setIsOpen((o) => !o)}
      />
      <MenuListContainer
        mode="big"
        onOutsideClick={() => {
          setIsOpen(false);
          x.set(-1000);
        }}
        isOpen={isOpen}
        className="px-8"
        x={x}
      >
        <Markdown>{body}</Markdown>
      </MenuListContainer>
    </article>
  );
};
