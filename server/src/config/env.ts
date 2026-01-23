import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
    port: number;
    nodeEnv: string;
    openaiApiKey: string;
    serperApiKey: string | undefined;
    corsOrigin: string;
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
    openaiApiKey: getEnvVar('OPENAI_API_KEY', 'sk-placeholder'),
    serperApiKey: process.env.SERPER_API_KEY,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const isDev = env.nodeEnv === 'development';
export const isProd = env.nodeEnv === 'production';

// Validate critical vars in production
if (isProd && env.openaiApiKey === 'sk-placeholder') {
    throw new Error('OPENAI_API_KEY must be set in production');
}
