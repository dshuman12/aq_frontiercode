export interface SupabaseJwtPayload {
  id: string;
  sub: string;
  email: string;
  role: string;
  aud: string;
  user_metadata: {
    full_name: string;
    [key: string]: any;
  };
  app_metadata?: Record<string, any>;
}
export interface AuthUser {
  id: string;
  email?: string;
  role: string;
  clientId?: string;
}
