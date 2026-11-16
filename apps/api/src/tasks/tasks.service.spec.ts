import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { TasksService } from './tasks.service';

const rep: AuthUser = { id: 'rep-1', email: 'rep@example.test', name: 'Rep', role: Role.SALES_REP };
const manager: AuthUser = { id: 'mgr-1', email: 'manager@example.test', name: 'Manager', role: Role.SALES_MANAGER };
const task = { id: 'task-1', assigneeId: rep.id, version: 3, title: 'Call', dueDate: new Date(), priority: 'MEDIUM', status: 'PENDING', leadId: 'lead-1', dealId: null };

describe('TasksService', () => {
  it('rejects tasks that link both a lead and a deal', async () => {
    const service = new TasksService({} as any);
    await expect(service.create(rep, { title: 'Call', dueDate: new Date().toISOString(), leadId: 'lead-1', dealId: 'deal-1' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a not-found error for a nonexistent update assignee', async () => {
    const prisma = { task: { findUnique: jest.fn().mockResolvedValue(task) }, user: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new TasksService(prisma);
    await expect(service.update(manager, task.id, { assigneeId: 'missing-user' } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not expose linked record names outside task assignee access scope', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([{ ...task, lead: { id: 'lead-2', name: 'Private lead', assignedToId: 'other-rep' }, deal: null, assignee: null }]) },
    } as any;
    const service = new TasksService(prisma);
    const result = await service.list(rep);
    expect(result[0].lead).toBeNull();
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assigneeId: rep.id }) }));
  });

  it('rejects an update using a stale version', async () => {
    const prisma = {
      task: {
        findUnique: jest.fn().mockResolvedValue(task),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;
    const service = new TasksService(prisma);
    await expect(service.update(rep, task.id, { status: 'COMPLETED', version: 2 } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: task.id, version: 2, assigneeId: rep.id } }));
  });
});
