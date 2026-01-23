export class ApiError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string = 'Bad Request'): ApiError {
        return new ApiError(message, 400);
    }

    static notFound(message: string = 'Not Found'): ApiError {
        return new ApiError(message, 404);
    }

    static internal(message: string = 'Internal Server Error'): ApiError {
        return new ApiError(message, 500, false);
    }
}
