import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('allows managers to list assignable team members', async () => {
    const user: AuthUser = { id: 'manager', email: 'manager@example.test', name: 'Manager', role: Role.SALES_MANAGER };
    const prisma = { user: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    const service = new UsersService(prisma);
    await service.listAssignable(user);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true, email: true, role: true } }));
  });

  it('denies representatives access to assignable team members', async () => {
    const user: AuthUser = { id: 'rep', email: 'rep@example.test', name: 'Rep', role: Role.SALES_REP };
    const prisma = { user: { findMany: jest.fn() } } as any;
    const service = new UsersService(prisma);
    await expect(service.listAssignable(user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
