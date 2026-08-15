import type React from "react";
import { EnvelopeIllustration } from "./EnvelopeIllustration";
import { MailboxIllustration } from "./MailboxIllustration";
import { TerminalIllustration } from "./TerminalIllustration";
import { NotebookIllustration } from "./NotebookIllustration";

export type IllustrationComponent = (props: {
  className?: string;
}) => React.ReactElement;

export type SequenceIllustrationEntry = {
  key: string;
  label: string;
  Component: IllustrationComponent;
};

/// Galería de ilustraciones elegibles para el hero de la landing pública.
/// El `key` es lo que se guarda en `Sequence.illustration`.
export const SEQUENCE_ILLUSTRATIONS: SequenceIllustrationEntry[] = [
  { key: "envelope", label: "Sobre que se abre", Component: EnvelopeIllustration },
  { key: "mailbox", label: "Buzón con cartas", Component: MailboxIllustration },
  { key: "terminal", label: "Terminal en bucle", Component: TerminalIllustration },
  { key: "notebook", label: "Libreta que pasa hojas", Component: NotebookIllustration },
];

/// Resuelve por key. Si la key no existe (o viene null desde la DB) no truena:
/// simplemente no dibuja nada y la landing se queda con su layout.
export function SequenceIllustration({
  illustration,
  className,
}: {
  illustration?: string | null;
  className?: string;
}) {
  const entry = SEQUENCE_ILLUSTRATIONS.find((i) => i.key === illustration);
  if (!entry) return null;
  const { Component } = entry;
  return <Component className={className} />;
}

export {
  EnvelopeIllustration,
  MailboxIllustration,
  TerminalIllustration,
  NotebookIllustration,
};
