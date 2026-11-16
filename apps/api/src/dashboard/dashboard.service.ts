import { Injectable } from '@nestjs/common';
import { DealStage, LeadStatus, Prisma, TaskStatus } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { isManager } from '../common/business-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const manager = isManager(user);
    const leadWhere: Prisma.LeadWhereInput = manager ? {} : { assignedToId: user.id };
    const dealWhere: Prisma.DealWhereInput = manager ? {} : { ownerId: user.id };
    const [totalLeads, leadGroups, activeDeals, wonDeals, pipeline, upcomingTasks, recentLeads] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.lead.groupBy({ by: ['status'], where: leadWhere, _count: { _all: true } }),
      this.prisma.deal.count({ where: { ...dealWhere, stage: { notIn: [DealStage.WON, DealStage.LOST] } } }),
      this.prisma.deal.aggregate({
        where: {
          ...dealWhere,
          stage: DealStage.WON,
          wonAt: { gte: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1) },
        },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({ where: { ...dealWhere, stage: { notIn: [DealStage.WON, DealStage.LOST] } }, _sum: { value: true } }),
      this.prisma.task.findMany({
        where: { ...(!manager ? { assigneeId: user.id } : {}), status: { not: TaskStatus.COMPLETED }, dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } },
        include: { lead: { select: { id: true, name: true, assignedToId: true } }, deal: { select: { id: true, name: true, ownerId: true } } },
        orderBy: { dueDate: 'asc' }, take: 5,
      }),
      this.prisma.lead.findMany({ where: leadWhere, include: { assignedTo: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const statusOrder: LeadStatus[] = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED, LeadStatus.LOST];
    const byStatus = Object.fromEntries(statusOrder.map((status) => [status, leadGroups.find((group) => group.status === status)?._count._all ?? 0]));
    const safeUpcomingTasks = upcomingTasks.map(({ lead, deal, ...task }) => ({
      ...task,
      lead: lead && (manager || lead.assignedToId === user.id) ? { id: lead.id, name: lead.name } : null,
      deal: deal && (manager || deal.ownerId === user.id) ? { id: deal.id, name: deal.name } : null,
    }));
    return {
      metrics: { totalLeads, activeDeals, wonDealValue: wonDeals._sum.value?.toString() ?? '0', pipelineValue: pipeline._sum.value?.toString() ?? '0' },
      leadsByStatus: byStatus,
      upcomingTasks: safeUpcomingTasks,
      recentLeads,
    };
  }
}
