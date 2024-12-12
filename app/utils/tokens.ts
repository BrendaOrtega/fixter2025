import jwt from "jsonwebtoken";

export const generateUserToken = (data: { email: string }) => {
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "1h",
  });
};

export const validateUserToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.SECRET || "fixtergeek") as {
      email: string;
    };
    return {
      isValid: true,
      decoded,
    };
  } catch (e: unknown) {
    console.error(e);
    return {
      isValid: false,
      err: e,
      errorMessage: (e as Error).message,
    };
  }
};
