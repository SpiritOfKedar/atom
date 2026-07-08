import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from './apiError';

describe('ApiError', () => {
    it('creates errors with correct status codes', () => {
        assert.equal(ApiError.badRequest('bad').statusCode, 400);
        assert.equal(ApiError.notFound().statusCode, 404);
        assert.equal(ApiError.tooManyRequests().statusCode, 429);
        assert.equal(ApiError.serviceUnavailable().statusCode, 503);
    });
});
