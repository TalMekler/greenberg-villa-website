import type { BookingPrice, Inquiry, InquiryInput, InquiryStatus } from "./inquiry";
import type { AdminUser } from "./user";
import type { ExploreSlug, SingleImageKey, SiteImages } from "./site-images";
import type { VillaLocation } from "./location";
import type { NotifyResult } from "./notify";
import type { Language } from "../i18n/types";

/** Thrown for any non-2xx response; `fieldErrors` carries the server's per-field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      // The admin session lives in an httpOnly cookie.
      credentials: "same-origin",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the booking service.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string; errors?: Record<string, string> };
    throw new ApiError(
      body.error ?? "The booking service returned an error.",
      response.status,
      body.errors,
    );
  }

  return payload as T;
}

/** Public endpoint — taken dates only, no guest details. */
export async function fetchBookedDates(): Promise<Set<string>> {
  const { bookedDates } = await request<{ bookedDates: string[] }>("/api/availability");
  return new Set(bookedDates);
}

export async function fetchInquiries(): Promise<Inquiry[]> {
  const { inquiries } = await request<{ inquiries: Inquiry[] }>("/api/inquiries");
  return inquiries;
}

/** `language` picks the language of the guest's confirmation email. */
export async function createInquiry(input: InquiryInput, language: Language): Promise<Inquiry> {
  const { inquiry } = await request<{ inquiry: Inquiry }>("/api/inquiries", {
    method: "POST",
    body: JSON.stringify({ ...input, language }),
  });
  return inquiry;
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<Inquiry> {
  const { inquiry } = await request<{ inquiry: Inquiry }>(`/api/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return inquiry;
}

/** Erases a cancelled inquiry. The server refuses any other status. */
export async function deleteInquiry(id: string): Promise<void> {
  await request(`/api/inquiries/${id}`, { method: "DELETE" });
}

export interface Session {
  authenticated: boolean;
  /** False when no account exists and no bootstrap env vars are set. */
  configured: boolean;
  user: AdminUser | null;
}

export async function fetchSession(): Promise<Session> {
  return request<Session>("/api/auth/session");
}

export async function login(email: string, password: string): Promise<void> {
  await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AdminUser> {
  const { user } = await request<{ user: AdminUser }>("/api/account/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return user;
}

/** Pass `null` to clear the price. */
export async function setBookingPrice(
  id: string,
  price: BookingPrice | null,
): Promise<Inquiry> {
  const { inquiry } = await request<{ inquiry: Inquiry }>(`/api/inquiries/${id}/price`, {
    method: "PATCH",
    body: JSON.stringify(price ?? { amount: null }),
  });
  return inquiry;
}

/** Sends a sample inquiry email; resolves with the outcome even when sending failed. */
export async function sendTestEmail(): Promise<NotifyResult> {
  const { result } = await request<{ result: NotifyResult }>("/api/notifications/test", {
    method: "POST",
  });
  return result;
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const { users } = await request<{ users: AdminUser[] }>("/api/users");
  return users;
}

export async function createUser(email: string, password: string): Promise<AdminUser> {
  const { user } = await request<{ user: AdminUser }>("/api/users", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/api/users/${id}`, { method: "DELETE" });
}

/** Issues another admin a new initial password; they must replace it at sign-in. */
export async function resetUserPassword(id: string, password: string): Promise<AdminUser> {
  const { user } = await request<{ user: AdminUser }>(`/api/users/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return user;
}

export async function fetchSiteImages(): Promise<SiteImages> {
  return request<SiteImages>("/api/site-images");
}

/** multipart — `request` sets a JSON content type, so this posts directly. */
async function uploadImage(path: string, file: File, alt: string): Promise<SiteImages> {
  const body = new FormData();
  body.append("image", file);
  body.append("alt", alt);

  let response: Response;
  try {
    response = await fetch(path, { method: "POST", credentials: "same-origin", body });
  } catch {
    throw new ApiError("Could not reach the booking service.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = (payload ?? {}) as { error?: string; errors?: Record<string, string> };
    throw new ApiError(
      failure.error ?? "The upload was rejected.",
      response.status,
      failure.errors,
    );
  }

  return payload as SiteImages;
}

export async function uploadSingleImage(
  key: SingleImageKey,
  file: File,
  alt: string,
): Promise<SiteImages> {
  return uploadImage(`/api/site-images/single/${key}`, file, alt);
}

export async function uploadExploreImage(
  slug: ExploreSlug,
  file: File,
  alt: string,
): Promise<SiteImages> {
  return uploadImage(`/api/site-images/explore/${slug}`, file, alt);
}

export async function uploadGalleryImage(file: File, alt: string): Promise<SiteImages> {
  return uploadImage("/api/site-images/gallery", file, alt);
}

export async function deleteGalleryImage(id: string): Promise<SiteImages> {
  return request<SiteImages>(`/api/site-images/gallery/${id}`, { method: "DELETE" });
}

export async function updateImageAlt(id: string, alt: string): Promise<SiteImages> {
  return request<SiteImages>(`/api/site-images/${id}/alt`, {
    method: "PATCH",
    body: JSON.stringify({ alt }),
  });
}

export async function reorderGallery(ids: string[]): Promise<SiteImages> {
  return request<SiteImages>("/api/site-images/gallery/order", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function fetchLocation(): Promise<VillaLocation> {
  return request<VillaLocation>("/api/location");
}

export async function saveLocation(location: VillaLocation): Promise<VillaLocation> {
  return request<VillaLocation>("/api/location", {
    method: "PUT",
    body: JSON.stringify(location),
  });
}
