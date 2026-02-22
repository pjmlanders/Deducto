import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from './pagination.js';

describe('parsePagination', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it('parses valid page and limit', () => {
    expect(parsePagination({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10 });
  });

  it('enforces minimum page 1', () => {
    expect(parsePagination({ page: '0' })).toEqual({ page: 1, limit: 20 });
    expect(parsePagination({ page: '-1' })).toEqual({ page: 1, limit: 20 });
  });

  it('caps limit at 100', () => {
    expect(parsePagination({ limit: '200' })).toEqual({ page: 1, limit: 100 });
  });

  it('enforces minimum limit 1', () => {
    expect(parsePagination({ limit: '0' })).toEqual({ page: 1, limit: 20 });
  });

  it('ignores invalid values and uses defaults', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({ page: 1, limit: 20 });
  });
});

describe('paginatedResponse', () => {
  it('returns data and pagination metadata', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = paginatedResponse(data, 50, { page: 2, limit: 10 });
    expect(result.data).toEqual(data);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
  });

  it('computes totalPages correctly', () => {
    const result = paginatedResponse([], 0, { page: 1, limit: 20 });
    expect(result.pagination.totalPages).toBe(0);
  });
});
