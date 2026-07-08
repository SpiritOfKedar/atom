import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUrlSafeForFetch } from './url-safety';

describe('isUrlSafeForFetch', () => {
    it('allows public HTTPS URLs', () => {
        assert.equal(isUrlSafeForFetch('https://example.com/article'), true);
    });

    it('blocks localhost', () => {
        assert.equal(isUrlSafeForFetch('http://localhost/admin'), false);
    });

    it('blocks private IPv4', () => {
        assert.equal(isUrlSafeForFetch('http://192.168.1.1/internal'), false);
        assert.equal(isUrlSafeForFetch('http://10.0.0.1/'), false);
        assert.equal(isUrlSafeForFetch('http://127.0.0.1/'), false);
    });

    it('blocks non-HTTP schemes', () => {
        assert.equal(isUrlSafeForFetch('file:///etc/passwd'), false);
        assert.equal(isUrlSafeForFetch('ftp://example.com'), false);
    });

    it('blocks metadata endpoints', () => {
        assert.equal(isUrlSafeForFetch('http://metadata.google.internal/'), false);
    });
});
