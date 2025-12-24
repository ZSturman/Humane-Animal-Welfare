import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    auditStartTime?: number;
    user?: {
      id: string;
      email: string;
      name: string;
      role?: string;
    } | null;
    organization?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }
}
