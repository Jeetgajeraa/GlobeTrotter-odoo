import { BaseResponse } from "../constants";

/* ──────────────────────────────────────────────
   User model (mirrors Prisma schema, no passwordHash)
   ────────────────────────────────────────────── */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  profilePhoto: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

/* ──────────────────────────────────────────────
   GET /api/auth/me  →  { success, message, data: { user } }
   ────────────────────────────────────────────── */
export interface UserProfileResponse extends BaseResponse {
  data: {
    user: User;
  } | null;
}

/* ──────────────────────────────────────────────
   PATCH /api/auth/me  →  same shape
   ────────────────────────────────────────────── */
export interface UpdateProfileResponse extends BaseResponse {
  data: {
    user: User;
  } | null;
}

/* ──────────────────────────────────────────────
   PATCH payload fields (all optional)
   ────────────────────────────────────────────── */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  bio?: string;
  password?: string;
  profilePhoto?: File | null;
}

/* ──────────────────────────────────────────────
   Trip shapes (lightweight — for profile cards)
   ────────────────────────────────────────────── */
export interface TripSummary {
  id: string;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  createdAt: string;
}
