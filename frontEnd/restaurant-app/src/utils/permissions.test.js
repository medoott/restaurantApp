import { describe, it, expect } from 'vitest';
import { canAccessPage, getSafePage, getTopPages } from './permissions.js';
import { unwrapList } from './normalize.js';

describe('permission helpers', () => {
  it('blocks protected pages without the required permission', () => {
    expect(canAccessPage(['dashboard.view'], 'dashboard')).toBe(true);
    expect(canAccessPage([], 'dashboard')).toBe(false);
  });

  it('falls back to a safe page when access is blocked', () => {
    expect(getSafePage([], 'dashboard', ['home', 'menu'])).toBe('home');
    expect(getSafePage(['dashboard.view'], 'rbac', ['dashboard'])).toBe('dashboard');
  });

  it('does not expose the dashboard top page without dashboard permission', () => {
    const pages = getTopPages([]).map((page) => page.key);
    expect(pages).not.toContain('dashboard');
  });

  it('unwraps array payloads wrapped in object responses', () => {
    expect(unwrapList({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(unwrapList({ data: { items: [{ id: 2 }] } }, 'items')).toEqual([{ id: 2 }]);
    expect(unwrapList({ data: { orders: [{ id: 3 }] } }, 'orders')).toEqual([{ id: 3 }]);
  });
});
