/**
 * API Configuration
 * 
 * Centralized configuration loading with validation
 */

import { z } from 'zod';

// Configuration schema
const configSchema = z.object({
  env: z.enum(['development', 'test', 'production']).default('development'),
  debug: z.boolean().default(false),
  
  api: z.object({
    port: z.number().default(3001),
    baseUrl: z.string().default('http://localhost:3001'),
  }),
  
  cors: z.object({
    origins: z.array(z.string()).default(['http://localhost:3000']),
  }),
  
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('7d'),
    refreshExpiresIn: z.string().default('30d'),
  }),
  
  rateLimit: z.object({
    max: z.number().default(100),
  }),
  
  database: z.object({
    url: z.string(),
  }),
  
  redis: z.object({
    url: z.string().optional(),
    host: z.string().default('localhost'),
    port: z.number().default(6379),
  }),
  
  storage: z.object({
    provider: z.enum(['local', 's3', 'gcs']).default('local'),
    localPath: z.string().default('./uploads'),
    s3Bucket: z.string().optional(),
    s3Region: z.string().optional(),
  }),
  
  email: z.object({
    provider: z.enum(['smtp', 'sendgrid', 'mailgun']).default('smtp'),
    from: z.string().default('noreply@shelterlink.org'),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
  }),
  
  features: z.object({
    mlPredictions: z.boolean().default(false),
    publicApi: z.boolean().default(true),
    transfers: z.boolean().default(true),
    webhooks: z.boolean().default(true),
  }),
  
  integrations: z.object({
    aahaApiKey: z.string().optional(),
    aahaApiUrl: z.string().optional(),
    petfinderApiKey: z.string().optional(),
    petfinderApiSecret: z.string().optional(),
    shelterluvApiKey: z.string().optional(),
    asm3ApiUrl: z.string().optional(),
    asm3ApiKey: z.string().optional(),
  }),
});

type Config = z.infer<typeof configSchema>;

// Load configuration from environment
function loadConfig(): Config {
  const raw = {
    env: process.env.NODE_ENV,
    debug: process.env.DEBUG === 'true',
    
    api: {
      port: parseInt(process.env.API_PORT ?? '3001', 10),
      baseUrl: process.env.API_BASE_URL,
    },
    
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()),
    },
    
    jwt: {
      secret: process.env.JWT_SECRET ?? 'development-secret-change-in-production-minimum-32-chars',
      expiresIn: process.env.JWT_EXPIRES_IN,
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    },
    
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    },
    
    database: {
      url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/shelter_link',
    },
    
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    
    storage: {
      provider: process.env.STORAGE_PROVIDER as 'local' | 's3' | 'gcs',
      localPath: process.env.STORAGE_LOCAL_PATH,
      s3Bucket: process.env.AWS_S3_BUCKET,
      s3Region: process.env.AWS_REGION,
    },
    
    email: {
      provider: process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid' | 'mailgun',
      from: process.env.EMAIL_FROM,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    },
    
    features: {
      mlPredictions: process.env.FEATURE_ML_PREDICTIONS === 'true',
      publicApi: process.env.FEATURE_PUBLIC_API !== 'false',
      transfers: process.env.FEATURE_TRANSFERS !== 'false',
      webhooks: process.env.FEATURE_WEBHOOKS !== 'false',
    },
    
    integrations: {
      aahaApiKey: process.env.AAHA_API_KEY,
      aahaApiUrl: process.env.AAHA_API_URL,
      petfinderApiKey: process.env.PETFINDER_API_KEY,
      petfinderApiSecret: process.env.PETFINDER_API_SECRET,
      shelterluvApiKey: process.env.SHELTERLUV_API_KEY,
      asm3ApiUrl: process.env.ASM3_API_URL,
      asm3ApiKey: process.env.ASM3_API_KEY,
    },
  };

  const result = configSchema.safeParse(raw);
  
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }
  
  return result.data;
}

export const config = loadConfig();
export type { Config };
