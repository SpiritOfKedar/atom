import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getGuestUsage,
    incrementGuestUsage,
    isGuestLimitExceeded,
} from './guest-quota.service';

describe('guest-quota service', () => {
    const testIp = '203.0.113.50';

    it('starts at zero usage for a new IP', async () => {
        const ip = `${testIp}-new-${Date.now()}`;
        assert.equal(await getGuestUsage(ip), 0);
    });

    it('increments usage and enforces limit', async () => {
        const ip = `${testIp}-incr-${Date.now()}`;
        assert.equal(await incrementGuestUsage(ip), 1);
        assert.equal(await incrementGuestUsage(ip), 2);
        assert.equal(await isGuestLimitExceeded(ip), true);
    });
});
