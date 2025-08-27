export const useGoogleLogin = () => {
  const clientHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    // Client ID y URLs pre-calculadas para máxima velocidad
    const GOOGLE_CLIENT_ID = "590084716663-g42lg2ri98auua3oo6n412v9s6rlper4.apps.googleusercontent.com";
    const location = window.location.hostname === "localhost" 
      ? "http://localhost:3000"
      : "https://www.fixtergeek.com";
    
    // Construir URL de una sola vez
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(location + "/login?auth=google")}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent("https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")}`;
    
    // Redirección inmediata sin delays
    window.location.href = googleAuthUrl;
  };

  return { clientHandler, isLoading: false };
};
