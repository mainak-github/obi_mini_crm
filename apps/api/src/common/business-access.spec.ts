import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { assertRecordAccess, isManager } from './business-access';
import { AuthUser } from './current-user.decorator';

const rep: AuthUser = { id: 'rep-1', name: 'Taylor', email: 'rep@example.com', role: Role.SALES_REP };
const manager: AuthUser = { id: 'manager-1', name: 'Jordan', email: 'manager@example.com', role: Role.SALES_MANAGER };

describe('business access rules', () => {
  it('allows a sales representative to access their own records', () => {
    expect(() => assertRecordAccess(rep, rep.id)).not.toThrow();
  });

  it('denies a sales representative access to another owner’s records', () => {
    expect(() => assertRecordAccess(rep, 'another-rep')).toThrow(ForbiddenException);
  });

  it('allows managers to access team records', () => {
    expect(isManager(manager)).toBe(true);
    expect(() => assertRecordAccess(manager, 'another-rep')).not.toThrow();
  });

  it('does not classify representatives as managers', () => {
    expect(isManager(rep)).toBe(false);
  });
});
