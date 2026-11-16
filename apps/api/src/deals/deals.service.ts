import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DealStage, Prisma } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { assertRecordAccess, isManager } from '../common/business-access';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDealDto, UpdateDealDto } from './dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async list(user: AuthUser) {
    const manager = isManager(user);
    const where: Prisma.DealWhereInput = manager ? {} : { ownerId: user.id };
    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, assignedToId: true } },
        stageHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ stage: 'asc' }, { expectedCloseDate: 'asc' }],
    });
    return deals.map(({ lead, ...deal }) => ({
      ...deal,
      lead: lead && (manager || lead.assignedToId === user.id) ? { id: lead.id, name: lead.name } : null,
    }));
  }

  async create(user: AuthUser, dto: CreateDealDto) {
    const ownerId = isManager(user) ? (dto.ownerId ?? user.id) : user.id;
    if (!isManager(user) && dto.ownerId && dto.ownerId !== user.id) throw new ForbiddenException();
    await this.ensureUser(ownerId, 'Deal owner not found');
    if (dto.leadId) await this.ensureQualifiedLead(user, dto.leadId);
    const stage = dto.stage ?? DealStage.PROSPECTING;
    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          name: dto.name.trim(), value: new Prisma.Decimal(dto.value), ownerId,
          leadId: dto.leadId, stage,
          wonAt: stage === DealStage.WON ? new Date() : null,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        },
      });
      await tx.dealStageHistory.create({ data: { dealId: created.id, fromStage: null, toStage: stage, changedById: user.id } });
      return created;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateDealDto) {
    const existing = await this.prisma.deal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Deal not found');
    const manager = isManager(user);
    assertRecordAccess(user, existing.ownerId);
    if (!manager && dto.ownerId && dto.ownerId !== user.id) throw new ForbiddenException();
    const ownerId = manager ? (dto.ownerId ?? existing.ownerId) : existing.ownerId;
    if (dto.ownerId !== undefined) await this.ensureUser(ownerId, 'Deal owner not found');
    if (dto.leadId) await this.ensureQualifiedLead(user, dto.leadId);

    const expectedVersion = dto.version;
    const stageChanged = dto.stage !== undefined && dto.stage !== existing.stage;
    const data: Prisma.DealUpdateManyMutationInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.value !== undefined ? { value: new Prisma.Decimal(dto.value) } : {}),
      ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
      ...(stageChanged && dto.stage !== DealStage.WON ? { wonAt: null } : {}),
      ...(stageChanged && dto.stage === DealStage.WON ? { wonAt: new Date() } : {}),
      ...(dto.expectedCloseDate !== undefined ? { expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null } : {}),
      ...(dto.leadId !== undefined ? { leadId: dto.leadId } : {}),
      ...(manager && dto.ownerId !== undefined ? { ownerId } : {}),
      version: { increment: 1 },
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.deal.updateMany({
        where: { id, version: expectedVersion, ...(!manager ? { ownerId: user.id } : {}) },
        data,
      });
      if (!changed.count) throw new ConflictException('Deal changed; reload and try again');
      if (stageChanged) {
        await tx.dealStageHistory.create({ data: { dealId: id, fromStage: existing.stage, toStage: dto.stage!, changedById: user.id } });
      }
      return await tx.deal.findUniqueOrThrow({ where: { id } });
    });

    if (stageChanged) {
      const recipientIds = new Set([existing.ownerId, updated.ownerId]);
      for (const userId of recipientIds) {
        await this.notifications.createForUser({
          userId, type: 'DEAL_STAGE_CHANGED', title: 'Deal stage changed',
          message: `${existing.name} moved from ${existing.stage.toLowerCase()} to ${dto.stage!.toLowerCase()}`,
          entityType: 'deal', entityId: id,
        });
      }
    }
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Deal not found');
    assertRecordAccess(user, deal.ownerId);
    const removed = await this.prisma.deal.deleteMany({ where: { id, version: deal.version, ...(!isManager(user) ? { ownerId: user.id } : {}) } });
    if (!removed.count) throw new ConflictException('Deal ownership changed; reload and try again');
    return { success: true };
  }

  private async ensureUser(id: string, message: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException(message);
  }

  private async ensureQualifiedLead(user: AuthUser, id: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Linked lead not found');
    assertRecordAccess(user, lead.assignedToId);
    if (lead.status !== 'QUALIFIED') throw new ForbiddenException('Deals can only be linked to qualified leads');
  }
}
