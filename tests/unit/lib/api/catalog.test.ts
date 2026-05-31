/**
 * Unit tests: lib/api/catalog.ts
 *
 * catalog.ts is pure data — no browser APIs, no storage.
 * Tests verify structural contracts that downstream code depends on.
 */

import { describe, it, expect } from 'vitest';
import { API_CATALOG } from '../../../../lib/api/catalog';

describe('API_CATALOG', () => {
  it('contains at least one endpoint', () => {
    expect(API_CATALOG.length).toBeGreaterThan(0);
  });

  it('each endpoint has required fields', () => {
    for (const ep of API_CATALOG) {
      expect(ep.id, `endpoint ${ep.id} missing id`).toBeTruthy();
      expect(ep.name, `endpoint ${ep.id} missing name`).toBeTruthy();
      expect(['GET', 'POST']).toContain(ep.method);
      expect(ep.path, `endpoint ${ep.id} missing path`).toMatch(/^\//);
      expect(typeof ep.hasBody).toBe('boolean');
    }
  });

  it('POST endpoints have a bodyTemplate', () => {
    const postEndpoints = API_CATALOG.filter((ep) => ep.method === 'POST');
    for (const ep of postEndpoints) {
      expect(ep.bodyTemplate, `POST endpoint ${ep.id} should have bodyTemplate`).not.toBeNull();
    }
  });

  it('GET endpoints have null bodyTemplate', () => {
    const getEndpoints = API_CATALOG.filter((ep) => ep.method === 'GET');
    for (const ep of getEndpoints) {
      expect(ep.bodyTemplate, `GET endpoint ${ep.id} should have null bodyTemplate`).toBeNull();
    }
  });

  it('includes the batch-preview stock polling endpoint', () => {
    const ep = API_CATALOG.find((e) => e.id === 'batch-preview');
    expect(ep).toBeDefined();
    expect(ep!.method).toBe('POST');
    expect(ep!.path).toBe('/api/biz/pay/batch-preview');
  });

  it('IDs are unique', () => {
    const ids = API_CATALOG.map((ep) => ep.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
