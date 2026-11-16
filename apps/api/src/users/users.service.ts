import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../common/current-user.decorator';
import { isManager } from '../common/business-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignable(user: AuthUser) {
    if (!isManager(user)) throw new ForbiddenException('Only managers can view assignable users');
    return await this.prisma.user.findMany({
      where: { role: { in: ['SALES_REP', 'SALES_MANAGER', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
  }
}
