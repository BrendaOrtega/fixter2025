import type { User } from "@prisma/client";
import { db } from "./db";
import { commitSession, getSession } from "~/sessions";
import { redirect } from "react-router";
import { createAndWelcomeUser } from "./dbGetters";

type GoogleUserData = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
};

export const googleHandler = async (request: Request, nextURL: string) => {
  const url = new URL(request.url);
  const { searchParams } = url;
  
  // Handle Google OAuth callback
  if (
    searchParams.has("auth") &&
    searchParams.has("code") &&
    searchParams.get("auth") === "google"
  ) {
    const next = searchParams.get("next") || nextURL || "/mis-cursos";
    const code = searchParams.get("code")!;
    
    try {
      console.log("🚀 Starting Google OAuth flow...");
      const session = await createGoogleSession(code, request);
      
      console.log(`✅ Redirecting to: ${next}`);
      // Redirect exitoso - no envolver en try/catch
      return redirect(next, {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
      
    } catch (error) {
      console.error("❌ Google OAuth error:", error);
      // Solo llegar aquí si createGoogleSession falla
      return redirect("/login?error=google_auth_failed", {
        status: 302
      });
    }
  }

  // Handle Google OAuth error callback
  if (searchParams.has("error")) {
    const error = searchParams.get("error");
    console.error("❌ Google OAuth error from Google:", error);
    return redirect("/login?error=google_oauth_denied", {
      status: 302
    });
  }
};

const location =
  process.env.NODE_ENV === "production"
    ? "https://www.fixtergeek.com"
    : "http://localhost:3000";
// step 1
export const getGoogleURL = () => {
  const url = new URL("https://accounts.google.com/o/oauth2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID as string);
  url.searchParams.set("redirect_uri", location + "/login?auth=google");
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
  );
  return url.toString();
};

const validateGoogleCode = (code: string) => {
  const url = "https://oauth2.googleapis.com/token";
  
  // Los parámetros deben ir en el body como form-data, no en searchParams
  const body = new URLSearchParams();
  body.append("code", code);
  body.append("client_id", process.env.GOOGLE_CLIENT_ID as string);
  body.append("client_secret", process.env.GOOGLE_SECRET as string);
  body.append("redirect_uri", location + "/login?auth=google");
  body.append("grant_type", "authorization_code");

  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  };
  
  return fetch(url, options)
    .then((r) => r.json())
    .catch((e) => {
      console.error("Error validating Google code:", e);
      return { error: e.message };
    });
};

export const createGoogleSession = async (code: string, request: Request) => {
  try {
    console.log("🔍 Validating Google code...");
    const tokenResponse = await validateGoogleCode(code);
    
    if (tokenResponse.error || !tokenResponse.access_token) {
      console.error("❌ Token validation failed:", tokenResponse.error);
      throw new Error(`Google OAuth error: ${tokenResponse.error || 'No access token received'}`);
    }

    console.log("✅ Token received, fetching user data...");
    const userData = (await getGoogleExtraData(tokenResponse.access_token)) as GoogleUserData;
    
    if (!userData || !userData.email) {
      console.error("❌ Failed to get user data from Google");
      throw new Error("Failed to retrieve user information from Google");
    }

    const partial = {
      username: userData.email,
      displayName: userData.name,
      confirmed: userData.verified_email,
      email: userData.email,
      photoURL: userData.picture,
    } as User;

    console.log(`✅ Creating/updating user: ${partial.email}`);
    await createAndWelcomeUser(partial);

    const session = await getSession(request.headers.get("Cookie"));
    session.set("email", partial.email);
    
    console.log("✅ Google session created successfully");
    return session;
    
  } catch (error) {
    console.error("❌ Error in createGoogleSession:", error);
    throw error;
  }
};

const getGoogleExtraData = (access_token: string): Promise<GoogleUserData> => {
  const url = "https://www.googleapis.com/oauth2/v2/userinfo";
  const options: RequestInit = {
    headers: { 
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json"
    },
  };
  
  return fetch(url, options)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("❌ Error fetching Google user data:", error);
      throw error;
    });
};
