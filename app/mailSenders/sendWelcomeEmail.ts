import { sendAisdkWebinarConfirmation } from "./sendAisdkWebinarConfirmation";
import { sendAisdkTaller1Welcome } from "./sendAisdkTaller1Welcome";

type WelcomeEmailProps = {
  type: string;
  to: string;
  userName?: string;
};

/**
 * Dispatcher genérico para enviar emails de bienvenida
 * según el tipo de evento/producto
 */
export const sendWelcomeEmail = async ({
  type,
  to,
  userName,
}: WelcomeEmailProps) => {
  switch (type) {
    case "aisdk-webinar":
      return sendAisdkWebinarConfirmation({ to, userName });

    case "aisdk-taller-1":
      return sendAisdkTaller1Welcome({ to, userName });

    // Agregar más tipos según se necesiten:
    // case "claude-webinar":
    //   return sendClaudeWebinarWelcome({ to, userName });
    // case "agentes-taller":
    //   return sendAgentesWelcome({ to, userName });

    default:
      console.warn(`sendWelcomeEmail: tipo desconocido "${type}"`);
      return null;
  }
};
