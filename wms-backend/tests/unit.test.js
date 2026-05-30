const {
  abilitiesForRole,
  hashPlainToken,
  hashPassword,
  verifyPassword,
} = require('../src/utils');

describe('utility behavior', () => {
  test('maps WMS roles to abilities', () => {
    expect(abilitiesForRole('admin')).toContain('admin');
    expect(abilitiesForRole('manager')).toEqual(expect.arrayContaining(['stock-in', 'stock-out']));
    expect(abilitiesForRole('warehouse_staff')).toEqual(['stock-in', 'stock-out']);
  });

  test('hashes bearer token plaintext using sha256', () => {
    expect(hashPlainToken('abc')).toHaveLength(64);
    expect(hashPlainToken('abc')).toBe(hashPlainToken('abc'));
    expect(hashPlainToken('abc')).not.toBe(hashPlainToken('def'));
  });

  test('creates bcrypt hashes that can verify seeded passwords', async () => {
    const hash = await hashPassword('123');
    await expect(verifyPassword('123', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
