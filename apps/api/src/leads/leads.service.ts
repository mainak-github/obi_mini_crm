import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { assertRecordAccess, isManager } from '../common/business-access';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadDto, LeadQueryDto, UpdateLeadDto } from './dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async list(user: AuthUser, query: LeadQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.LeadWhereInput = {
      ...(!isManager(user) ? { assignedToId: user.id } : query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const validSort = ['createdAt', 'updatedAt', 'name', 'email', 'status'].includes(query.sortBy ?? '') ? query.sortBy as string : 'createdAt';
    const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, include: { assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { [validSort]: direction }, skip: (page - 1) * limit, take: limit }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(user: AuthUser, dto: CreateLeadDto) {
    const assignedToId = isManager(user) ? (dto.assignedToId === undefined ? user.id : dto.assignedToId) : user.id;
    if (assignedToId && assignedToId !== user.id && !isManager(user)) throw new ForbiddenException();
    if (assignedToId) await this.ensureUser(assignedToId);
    try {
      const lead = await this.prisma.lead.create({ data: { ...dto, email: dto.email.trim().toLowerCase(), name: dto.name.trim(), assignedToId } });
      if (assignedToId && assignedToId !== user.id) await this.notifications.createForUser({
        userId: assignedToId, type: 'LEAD_ASSIGNED', title: 'A lead was assigned to you',
        message: `${lead.name} has been added to your leads`, entityType: 'lead', entityId: lead.id,
      });
      return lead;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) throw new ConflictException('A lead with this email already exists');
      throw error;
    }
  }

  async get(user: AuthUser, id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      deals: { where: isManager(user) ? {} : { ownerId: user.id } },
      tasks: { where: isManager(user) ? {} : { assigneeId: user.id } },
    } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertRecordAccess(user, lead.assignedToId);
    return lead;
  }

  async update(user: AuthUser, id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    assertRecordAccess(user, existing.assignedToId);
    const expectedVersion = dto.version;
    const assignedToId = dto.assignedToId === undefined ? existing.assignedToId : (isManager(user) ? dto.assignedToId : user.id);
    if (assignedToId) await this.ensureUser(assignedToId);
    const updateData: Prisma.LeadUpdateManyMutationInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.company !== undefined ? { company: dto.company } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.assignedToId !== undefined ? { assignedToId } : {}),
      version: { increment: 1 },
    };

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.lead.updateMany({
          where: { id, version: expectedVersion, ...(!isManager(user) ? { assignedToId: user.id } : {}) },
          data: updateData,
        });
        if (!changed.count) throw new ConflictException('Lead changed; reload and try again');
        return await tx.lead.findUniqueOrThrow({ where: { id } });
      });
      if (assignedToId && assignedToId !== existing.assignedToId) await this.notifications.createForUser({
        userId: assignedToId, type: 'LEAD_ASSIGNED', title: 'A lead was assigned to you',
        message: `${result.name} has been assigned to you`, entityType: 'lead', entityId: id,
      });
      return result;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) throw new ConflictException('A lead with this email already exists');
      throw error;
    }
  }

  async remove(user: AuthUser, id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertRecordAccess(user, lead.assignedToId);
    const removed = await this.prisma.lead.deleteMany({ where: { id, version: lead.version, ...(!isManager(user) ? { assignedToId: user.id } : {}) } });
    if (!removed.count) throw new ConflictException('Lead changed; reload and try again');
    return { success: true };
  }

  private async ensureUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Assigned user not found');
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
