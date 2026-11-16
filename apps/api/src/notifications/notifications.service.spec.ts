import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('does not allow reading status to mutate another user notification', async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const service = new NotificationsService(prisma, {} as any);
    await expect(service.markRead('user-1', 'notification-from-user-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'notification-from-user-2', userId: 'user-1', readAt: null } }));
  });
});