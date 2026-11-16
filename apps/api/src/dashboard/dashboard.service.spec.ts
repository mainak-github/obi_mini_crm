import { DealStage, Role } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { DashboardService } from './dashboard.service';

const rep: AuthUser = { id: 'rep-1', email: 'rep@example.test', name: 'Rep', role: Role.SALES_REP };

describe('DashboardService', () => {
  it('counts won value only for deals won in the current quarter', async () => {
    const prisma: any = {
      lead: { count: async () => 0, groupBy: async () => [], findMany: async () => [] },
      deal: {
        count: async () => 0,
        aggregate: async (args: any) => {
          if (args.where.stage === DealStage.WON) {
            const quarterStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
            expect(args.where.wonAt.gte.getTime()).toBe(quarterStart.getTime());
          }
          return { _sum: { value: null } };
        },
      },
      task: { findMany: async () => [] },
    };
    const service = new DashboardService(prisma);
    await service.overview(rep);
  });
});

