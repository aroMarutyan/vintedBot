import { describe, expect, it } from 'vitest';

import { formatStatusIds, formatSearchToHTML } from '../../../src/services/format.service.js';

describe('format.service', () => {
  it('formats search details to HTML with optional values and status ids fallback', () => {
    const result = formatSearchToHTML({
      alias: 'macbook',
      active: true,
      searchTerm: 'macbook pro 16',
      searchId: '42',
      statusIds: new Set([''])
    });

    expect(result).toContain('<b>ALIAS:</b> macbook');
    expect(result).toContain('<b>IS ACTIVE:</b> Yes');
    expect(result).toContain('<b>STATUS IDS:</b> All');
    expect(result).not.toContain('<b>MIN PRICE:</b>');
  });

  it('returns all status ids when input is missing', () => {
    expect(Array.from(formatStatusIds())).toEqual(['']);
  });

  it('filters unknown status ids and trims values', () => {
    expect(Array.from(formatStatusIds('3, 9, 4 '))).toEqual(['3', '4']);
  });

  it('prioritizes all when provided in list', () => {
    expect(Array.from(formatStatusIds('3,all,4'))).toEqual(['']);
  });
});
