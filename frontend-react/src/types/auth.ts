/**
 * RBAC & Authentication Types
 * Financial Management System — Transaction Core
 */

export type RoleName = 'Super Admin' | 'Finance Manager' | 'Department Viewer';
export type RoleSlug = 'super_admin' | 'finance_manager' | 'department_viewer';

export interface Role {
  id: string;
  name: RoleName;
  slug: RoleSlug;
  description: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  department?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}
