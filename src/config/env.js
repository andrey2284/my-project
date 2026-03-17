import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),
  PUBLIC_CANDIDATE_BASE_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  ADMIN_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  DEFAULT_TOTAL_QUESTIONS: z.coerce.number().int().min(1).max(20).default(6),
  DEFAULT_MAX_VIOLATIONS: z.coerce.number().int().min(1).max(20).default(3)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = {
  ...parsed.data,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
};

export { env };
