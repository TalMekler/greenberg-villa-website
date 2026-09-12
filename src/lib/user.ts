// Shared between the browser and the API server — no asset or DOM imports.
// Password hashes never leave the server, so they are absent from this shape.

export interface AdminUser {
  id: string;
  email: string;
  /** True until the user replaces the initial password they were given. */
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string;
}
