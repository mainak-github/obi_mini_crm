import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from './current-user.decorator';

export const isManager = (user: AuthUser): boolean => user.role === Role.ADMIN || user.role === Role.SALES_MANAGER;

export const assertRecordAccess = (user: AuthUser, ownerId: string | null | undefined): void => {
  if (!isManager(user) && ownerId !== user.id) {
    throw new ForbiddenException('You can only access records assigned to you');
  }
};
