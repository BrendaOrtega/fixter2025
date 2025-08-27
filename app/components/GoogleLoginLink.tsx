import { FcGoogle } from "react-icons/fc";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import Spinner from "~/components/common/Spinner";

export function GoogleLoginLink() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Pre-calcular URL para máxima velocidad
  const GOOGLE_CLIENT_ID = "590084716663-g42lg2ri98auua3oo6n412v9s6rlper4.apps.googleusercontent.com";
  
  // Detectar entorno del lado del servidor si es posible, o usar window en cliente
  const location = typeof window !== 'undefined' 
    ? (window.location.hostname === "localhost" 
      ? "http://localhost:3000"
      : "https://www.fixtergeek.com")
    : "https://www.fixtergeek.com";
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(location + "/login?auth=google")}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent("https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")}`;

  const handleClick = () => {
    setIsLoading(true);
    // El navegador manejará la redirección
  };

  return (
    <a
      href={googleAuthUrl}
      onClick={handleClick}
      className={twMerge(
        "cursor-pointer py-3 px-4 text-white to-brand-200 text-base w-full shadow flex items-center gap-3 justify-center font-semibold bg-brand-900 rounded-full mx-auto my-8 hover:bg-brand-800 active:scale-95 transition-transform no-underline",
        isLoading && "opacity-75 pointer-events-none"
      )}
    >
      <span className="text-xl">
        {isLoading ? <Spinner /> : <FcGoogle />}
      </span>
      <span>{isLoading ? "Redirigiendo..." : "Inicia con Google"}</span>
    </a>
  );
}