import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { LeadsService } from './leads.service';

const resolved = (value: unknown) => jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);

const rep: AuthUser = { id: 'rep-1', email: 'rep@example.test', name: 'Rep', role: Role.SALES_REP };

const lead = (overrides: Record<string, unknown> = {}) => ({
  id: 'lead-1', name: 'Lead', email: 'lead@example.test', phone: null, company: null, source: null,
  status: 'NEW', assignedToId: rep.id, version: 0, createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

describe('LeadsService', () => {
  it('queries only linked deals and tasks visible to the requesting rep', async () => {
    const prisma = { lead: { findUnique: resolved({ ...lead(), assignedTo: null, deals: [], tasks: [] }) } } as any;
    const service = new LeadsService(prisma, {} as any);
    await service.get(rep, 'lead-1');
    expect(prisma.lead.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ deals: { where: { ownerId: rep.id } }, tasks: { where: { assigneeId: rep.id } } }),
    }));
  });

  it('rejects a concurrent update when the version has changed', async () => {
    const leadDelegate = {
      findUnique: resolved(lead()),
      updateMany: resolved({ count: 0 }),
      findUniqueOrThrow: jest.fn(),
    };
    const prisma = {
      lead: leadDelegate,
      user: { findUnique: resolved({ id: rep.id }) },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback({ lead: leadDelegate })),
    } as any;
    const service = new LeadsService(prisma, {} as any);
    await expect(service.update(rep, 'lead-1', { version: 0, status: 'QUALIFIED' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lead.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lead-1', version: 0, assignedToId: rep.id } }));
  });
});