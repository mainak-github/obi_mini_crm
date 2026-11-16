import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { assertRecordAccess, isManager } from '../common/business-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, upcoming = false, overdue = false) {
    const now = new Date();
    const manager = isManager(user);
    const where: Prisma.TaskWhereInput = {
      ...(!manager ? { assigneeId: user.id } : {}),
      ...(upcoming ? { dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, status: { not: TaskStatus.COMPLETED } } : {}),
      ...(overdue ? { dueDate: { lt: now }, status: { not: TaskStatus.COMPLETED } } : {}),
    };
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, assignedToId: true } },
        deal: { select: { id: true, name: true, ownerId: true } },
      },
      orderBy: [{ dueDate: 'asc' }],
    });
    return tasks.map(({ lead, deal, ...task }) => ({
      ...task,
      lead: lead && (manager || lead.assignedToId === user.id) ? { id: lead.id, name: lead.name } : null,
      deal: deal && (manager || deal.ownerId === user.id) ? { id: deal.id, name: deal.name } : null,
    }));
  }

  async create(user: AuthUser, dto: CreateTaskDto) {
    if (!dto.leadId && !dto.dealId) throw new ForbiddenException('Link each task to a lead or a deal');
    if (dto.leadId && dto.dealId) throw new ForbiddenException('Link a task to either a lead or a deal, not both');
    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
      if (!lead) throw new NotFoundException('Lead not found');
      assertRecordAccess(user, lead.assignedToId);
    }
    if (dto.dealId) {
      const deal = await this.prisma.deal.findUnique({ where: { id: dto.dealId } });
      if (!deal) throw new NotFoundException('Deal not found');
      assertRecordAccess(user, deal.ownerId);
    }
    const assigneeId = isManager(user) ? (dto.assigneeId ?? user.id) : user.id;
    if (!isManager(user) && dto.assigneeId && dto.assigneeId !== user.id) throw new ForbiddenException();
    await this.ensureUser(assigneeId);
    return await this.prisma.task.create({
      data: { title: dto.title.trim(), description: dto.description, dueDate: new Date(dto.dueDate), priority: dto.priority, status: dto.status, assigneeId, leadId: dto.leadId, dealId: dto.dealId },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const manager = isManager(user);
    if (!manager && task.assigneeId !== user.id) throw new ForbiddenException('You can only update your tasks');
    if (!manager && dto.assigneeId && dto.assigneeId !== user.id) throw new ForbiddenException();
    const assigneeId = manager ? (dto.assigneeId ?? task.assigneeId) : user.id;
    if (dto.assigneeId !== undefined) await this.ensureUser(assigneeId);
    const expectedVersion = dto.version ?? task.version;
    const updated = await this.prisma.task.updateMany({
      where: { id, version: expectedVersion, ...(!manager ? { assigneeId: user.id } : {}) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(manager && dto.assigneeId !== undefined ? { assigneeId } : {}),
        version: { increment: 1 },
      },
    });
    if (!updated.count) throw new ConflictException('Task was changed by another request; reload and try again');
    return await this.prisma.task.findUniqueOrThrow({ where: { id } });
  }

  async remove(user: AuthUser, id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const manager = isManager(user);
    if (!manager && task.assigneeId !== user.id) throw new ForbiddenException();
    const removed = await this.prisma.task.deleteMany({ where: { id, version: task.version, ...(!manager ? { assigneeId: user.id } : {}) } });
    if (!removed.count) throw new ConflictException('Task assignment changed; reload and try again');
    return { success: true };
  }

  private async ensureUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Assignee not found');
  }
}
