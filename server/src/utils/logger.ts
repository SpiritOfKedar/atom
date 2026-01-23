import { isDev } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const levelColors: Record<LogLevel, string> = {
    debug: colors.magenta,
    info: colors.cyan,
    warn: colors.yellow,
    error: colors.red,
};

const formatMessage = (level: LogLevel, message: string, context?: string): string => {
    const timestamp = new Date().toISOString();
    const coloredLevel = `${levelColors[level]}[${level.toUpperCase()}]${colors.reset}`;
    const contextStr = context ? `${colors.blue}[${context}]${colors.reset} ` : '';
    return `${colors.green}${timestamp}${colors.reset} ${coloredLevel} ${contextStr}${message}`;
};

export const logger = {
    debug: (message: string, context?: string) => {
        if (isDev) console.log(formatMessage('debug', message, context));
    },
    info: (message: string, context?: string) => {
        console.log(formatMessage('info', message, context));
    },
    warn: (message: string, context?: string) => {
        console.warn(formatMessage('warn', message, context));
    },
    error: (message: string, context?: string, error?: Error) => {
        console.error(formatMessage('error', message, context));
        if (error && isDev) console.error(error.stack);
    },
};
