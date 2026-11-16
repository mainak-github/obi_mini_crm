import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('rejects login passwords beyond bcrypt’s byte limit before querying users', async () => {
    const prisma = { user: { findUnique: jest.fn() } } as any;
    const service = new AuthService(prisma, {} as any);
    await expect(service.login({ email: 'candidate@example.test', password: 'é'.repeat(40) })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
