import { z } from "zod";

// Authentication validation
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "האימייל הוא שדה חובה")
    .email("כתובת אימייל לא תקינה")
    .max(255, "האימייל ארוך מדי"),
  password: z
    .string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .max(100, "הסיסמה ארוכה מדי"),
});

// Property validation
export const propertySchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "הכתובת היא שדה חובה")
    .max(200, "הכתובת ארוכה מדי"),
  city: z
    .string()
    .trim()
    .min(1, "העיר היא שדה חובה")
    .max(100, "העיר ארוכה מדי"),
  price: z
    .number()
    .positive("המחיר חייב להיות חיובי")
    .max(999999999, "המחיר גבוה מדי")
    .finite("המחיר חייב להיות מספר תקין"),
  size_sqm: z
    .number()
    .int("השטח חייב להיות מספר שלם")
    .positive("השטח חייב להיות חיובי")
    .max(10000, "השטח גדול מדי")
    .nullable(),
  rooms: z
    .number()
    .positive("מספר החדרים חייב להיות חיובי")
    .max(20, "מספר החדרים גבוה מדי")
    .nullable(),
  floor: z
    .number()
    .int("הקומה חייבת להיות מספר שלם")
    .min(-5, "הקומה נמוכה מדי")
    .max(200, "הקומה גבוהה מדי")
    .nullable(),
  description: z
    .string()
    .max(5000, "התיאור ארוך מדי")
    .nullable()
    .optional(),
  parking_spots: z
    .number()
    .int("מספר חניות חייב להיות מספר שלם")
    .min(0, "מספר חניות לא יכול להיות שלילי")
    .max(100, "מספר חניות גבוה מדי")
    .nullable(),
  has_safe_room: z.boolean().nullable().optional(),
  has_sun_balcony: z.boolean().nullable().optional(),
});

// User creation validation
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "האימייל הוא שדה חובה")
    .email("כתובת אימייל לא תקינה")
    .max(255, "האימייל ארוך מדי"),
  full_name: z
    .string()
    .trim()
    .min(1, "השם המלא הוא שדה חובה")
    .max(100, "השם המלא ארוך מדי"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{7,20}$/, "מספר טלפון לא תקין")
    .nullable()
    .optional(),
  password: z
    .string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת")
    .regex(/[^A-Za-z0-9]/, "הסיסמה חייבת להכיל לפחות תו מיוחד אחד")
    .max(100, "הסיסמה ארוכה מדי"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
