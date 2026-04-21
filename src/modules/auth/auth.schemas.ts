import { z } from "zod";

const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(128).regex(strongPasswordRegex, {
    error: "Password must contain at least one letter and one number."
  })
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

