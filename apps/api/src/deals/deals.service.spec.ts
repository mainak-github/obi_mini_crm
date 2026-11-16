import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { DealsService } from './deals.service';

const rep: AuthUser = { id: 'rep-1', email: 'rep@example.test', name: 'Rep', role: Role.SALES_REP };
const manager: AuthUser = { id: 'mgr-1', email: 'manager@example.test', name: 'Manager', role: Role.SALES_MANAGER };
const deal = (overrides: Record<string, unknown> = {}) => ({
  id: 'deal-1', name: 'Opportunity', ownerId: rep.id, stage: 'PROSPECTING', value: '10',
  expectedCloseDate: null, leadId: null, version: 2, ...overrides,
});

describe('DealsService', () => {
  it('hides a linked lead that is outside the rep’s lead scope', async () => {
    const prisma = { deal: { findMany: jest.fn().mockResolvedValue([{ ...deal(), owner: null, lead: { id: 'lead-2', name: 'Private lead', assignedToId: 'other-rep' }, stageHistory: [] }]) } } as any;
    const service = new DealsService(prisma, {} as any);
    const result = await service.list(rep);
    expect(result[0].lead).toBeNull();
  });

  it('rejects an unknown manager-supplied owner before inserting a deal', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new DealsService(prisma, {} as any);
    await expect(service.create(manager, { name: 'Opportunity', value: 10, ownerId: 'missing-user' } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not let a rep mutate a deal after it was reassigned', async () => {
    const transaction = {
      deal: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn(),
      },
      dealStageHistory: { create: jest.fn() },
    };
    const prisma = {
      deal: { findUnique: jest.fn().mockResolvedValue(deal()) },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(transaction)),
    } as any;
    const service = new DealsService(prisma, {} as any);
    await expect(service.update(rep, 'deal-1', { version: 2, name: 'Updated' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.deal.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'deal-1', version: 2, ownerId: rep.id } }));
  });
});