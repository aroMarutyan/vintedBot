import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(input => input)
}), { virtual: true });

describe('search-handler.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'search-table';
  });

  it('returns table name and marshalled search params', async () => {
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const { getTableName, getSearchParams } = await import('../../../src/services/search-handler.service.js');

    expect(getTableName()).toEqual({ TableName: 'search-table' });
    expect(getSearchParams('101')).toEqual({
      TableName: 'search-table',
      Key: { searchId: '101' }
    });
    expect(marshall).toHaveBeenCalledWith({ searchId: '101' });
  });

  it('maps new values for active, statusIds, numeric and empty values', async () => {
    const { handleNewValue } = await import('../../../src/services/search-handler.service.js');

    expect(handleNewValue('active', 'yes')).toBe(true);
    expect(handleNewValue('active', '0')).toBe(false);
    expect(handleNewValue('minPrice', '500')).toBe('500');
    expect(handleNewValue('alias')).toBe('');
  });

  it('validates existing searches and rejects unknown search id', async () => {
    const { validateSearch } = await import('../../../src/services/search-handler.service.js');

    expect(() => validateSearch('1', [{ searchId: '1' }])).not.toThrow();
    expect(() => validateSearch('2', [{ searchId: '1' }])).toThrow('A search with this searchId does not exist');
  });

  it('handles numeric validation and parameter count checks', async () => {
    const { handleNumericInput, validateNumericParam, validateParamCount } = await import('../../../src/services/search-handler.service.js');

    expect(handleNumericInput(undefined, 'minPrice')).toBe('');
    expect(validateNumericParam('500', 'minPrice')).toBe('500');
    expect(() => validateNumericParam('abc', 'minPrice')).toThrow('minPrice: abc is not a valid number');
    expect(() => validateParamCount(['/ns'], 3, 'create', 'a and b')).toThrow('Not enough params to create search');
  });

  it('generates deterministic id when random is mocked', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    const { getIdNum } = await import('../../../src/services/search-handler.service.js');

    expect(getIdNum()).toBe('123456');
    randomSpy.mockRestore();
  });
});
