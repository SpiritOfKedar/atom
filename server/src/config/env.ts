import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
    port: number;
    nodeEnv: string;
    openaiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
    geminiApiKey: string | undefined;
    nvidiaApiKey: string | undefined;
    serperApiKey: string | undefined;
    corsOrigin: string;
    redisUrl: string | undefined;
    mongodbUri: string;
    clerkSecretKey: string | undefined;
    requireAuthForChat: boolean;
    guestMessageLimit: number;
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
    nvidiaApiKey: process.env.NVIDIA_API_KEY || process.env.NVAPI_KEY,
    serperApiKey: process.env.SERPER_API_KEY,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/atom',
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    requireAuthForChat: process.env.REQUIRE_AUTH_FOR_CHAT === 'true',
    guestMessageLimit: parseInt(process.env.GUEST_MESSAGE_LIMIT || '2', 10),
};

export const isDev = env.nodeEnv === 'development';
export const isProd = env.nodeEnv === 'production';

const requireProdVar = (name: string, value: string | undefined): void => {
    if (!value || value.trim() === '') {
        throw new Error(`${name} must be set in production`);
    }
};

const assertNotLocalhostDefault = (name: string, value: string, forbidden: string[]): void => {
    const lower = value.toLowerCase();
    if (forbidden.some((f) => lower.includes(f))) {
        throw new Error(`${name} must not use development defaults in production`);
    }
};

if (isProd) {
    if (!env.openaiApiKey && !env.anthropicApiKey && !env.geminiApiKey && !env.nvidiaApiKey) {
        throw new Error(
            'At least one LLM API key must be set in production (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or NVIDIA_API_KEY)'
        );
    }

    requireProdVar('SERPER_API_KEY', env.serperApiKey);
    requireProdVar('CLERK_SECRET_KEY', env.clerkSecretKey);
    requireProdVar('MONGODB_URI', env.mongodbUri);
    requireProdVar('CORS_ORIGIN', env.corsOrigin);

    assertNotLocalhostDefault('MONGODB_URI', env.mongodbUri, ['localhost', '127.0.0.1']);
    assertNotLocalhostDefault('CORS_ORIGIN', env.corsOrigin, ['localhost']);

    if (!env.redisUrl) {
        console.warn(
            '⚠️  REDIS_URL is not set in production — guest quotas and BullMQ may not work correctly across instances'
        );
    }
}
