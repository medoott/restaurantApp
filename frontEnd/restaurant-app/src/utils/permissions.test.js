import { describe, it, expect } from 'vitest';
import { canAccessPage, getSafePage } from './permissions.js';

describe('permission helpers', () => {
  it('blocks protected pages without the required permission', () => {
    expect(canAccessPage(['dashboard.view'], 'dashboard')).toBe(true);
    expect(canAccessPage([], 'dashboard')).toBe(false);
  });

  it('falls back to a safe page when access is blocked', () => {
    expect(getSafePage([], 'dashboard', ['home', 'menu'])).toBe('home');
    expect(getSafePage(['dashboard.view'], 'rbac', ['dashboard'])).toBe('dashboard');
  });
});
