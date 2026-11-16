import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: NotificationsGateway) {}

  async createForUser(input: { userId: string; type: string; title: string; message: string; entityType: string; entityId: string }) {
    const notification = await this.prisma.notification.create({ data: input });
    await this.gateway.notifyUser(input.userId, notification as unknown as Record<string, unknown>);
    return notification;
  }

  async list(userId: string) {
    return await this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) {
      const notification = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
      if (!notification) throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }
}
