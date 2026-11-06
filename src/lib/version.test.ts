import { describe, expect, it } from 'vitest';
import { versionLabel } from './version';

describe('versionLabel', () => {
  it('formats prerelease versions', () => {
    expect(versionLabel('0.4.8-beta.2')).toBe('0.4.8 Beta 2');
    expect(versionLabel('v1.0.0-rc.1')).toBe('1.0.0 RC 1');
    expect(versionLabel('1.2.3')).toBe('1.2.3');
  });
});
