import {
  cacheAuthUser,
  getCachedAuthUser,
  cacheUserProfile,
  getCachedUserProfile,
  clearAllCache
} from '../cacheUtils';

describe('cacheUtils auth helpers', () => {
  const mockUser = { id: 'user-123', email: 'coach@example.com' };
  const mockProfile = { id: 'user-123', name: 'Coach Example' };

  beforeEach(() => {
    clearAllCache();
    localStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores and retrieves cached auth user', () => {
    expect(cacheAuthUser(mockUser)).toBe(true);
    expect(getCachedAuthUser()).toEqual(mockUser);
  });

  it('removes cached auth user when null is provided', () => {
    cacheAuthUser(mockUser);
    cacheAuthUser(null);

    expect(getCachedAuthUser()).toBeNull();
  });

  it('co-exists with cached profile data', () => {
    cacheAuthUser(mockUser);
    cacheUserProfile(mockProfile);

    expect(getCachedAuthUser()).toEqual(mockUser);
    expect(getCachedUserProfile()).toEqual(mockProfile);
  });
});

