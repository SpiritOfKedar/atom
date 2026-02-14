import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
    port: number;
    nodeEnv: string;
    openaiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
    geminiApiKey: string | undefined;
    serperApiKey: string | undefined;
    corsOrigin: string;
    redisUrl: string | undefined;
    mongodbUri: string;
    clerkSecretKey: string | undefined;
}

const getEnvVar = (key: string, fallback?: string): string => {
    const value = process.env[key];
    if (!value && fallback === undefined) {
        console.warn(`⚠️  Environment variable ${key} is not set`);
    }
    return value || fallback || '';
};

export const env: EnvConfig = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    serperApiKey: process.env.SERPER_API_KEY,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/atom',
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
};

export const isDev = env.nodeEnv === 'development';
export const isProd = env.nodeEnv === 'production';

// Validate critical vars in production
if (isProd && !env.openaiApiKey && !env.anthropicApiKey && !env.geminiApiKey) {
    throw new Error('At least one LLM API key must be set in production (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY)');
}
