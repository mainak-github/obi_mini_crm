import { PrismaClient, DealStage, LeadStatus, Role, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const [admin, manager, rep] = await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@miuicrm.dev' }, update: {}, create: { name: 'Alex Morgan', email: 'admin@miuicrm.dev', passwordHash, role: Role.ADMIN } }),
    prisma.user.upsert({ where: { email: 'manager@miuicrm.dev' }, update: {}, create: { name: 'Jordan Lee', email: 'manager@miuicrm.dev', passwordHash, role: Role.SALES_MANAGER } }),
    prisma.user.upsert({ where: { email: 'rep@miuicrm.dev' }, update: {}, create: { name: 'Taylor Kim', email: 'rep@miuicrm.dev', passwordHash, role: Role.SALES_REP } }),
  ]);
  const leadData = [
    { name: 'Priya Sharma', email: 'priya@northstar.example', company: 'Northstar Studio', phone: '+1 415 555 0134', source: 'Website', status: LeadStatus.QUALIFIED, assignedToId: rep.id },
    { name: 'Daniel Wright', email: 'daniel@bluepeak.example', company: 'Bluepeak Labs', phone: '+1 415 555 0171', source: 'Referral', status: LeadStatus.CONTACTED, assignedToId: manager.id },
    { name: 'Amara Okafor', email: 'amara@fieldnotes.example', company: 'Fieldnotes Co.', phone: '+1 415 555 0108', source: 'LinkedIn', status: LeadStatus.NEW, assignedToId: rep.id },
    { name: 'Luca Moretti', email: 'luca@monarch.example', company: 'Monarch Works', phone: '+1 415 555 0192', source: 'Event', status: LeadStatus.CONVERTED, assignedToId: manager.id },
    { name: 'Sofia Bennett', email: 'sofia@kindred.example', company: 'Kindred Health', phone: '+1 415 555 0153', source: 'Partner', status: LeadStatus.QUALIFIED, assignedToId: rep.id },
    { name: 'Ethan Chen', email: 'ethan@atlas.example', company: 'Atlas & Co.', phone: '+1 415 555 0116', source: 'Website', status: LeadStatus.CONTACTED, assignedToId: rep.id },
    { name: 'Maya Patel', email: 'maya@riverside.example', company: 'Riverside Collective', phone: '+1 415 555 0188', source: 'Campaign', status: LeadStatus.LOST, assignedToId: manager.id },
  ];
  const leads = await Promise.all(leadData.map(({ email, ...data }) => prisma.lead.upsert({ where: { email }, update: {}, create: { email, ...data } })));

  const dealData = [
    { name: 'Northstar rebrand', leadId: leads[0].id, value: '24800', stage: DealStage.NEGOTIATION, ownerId: rep.id, days: 18 },
    { name: 'Kindred care platform', leadId: leads[4].id, value: '38600', stage: DealStage.PROPOSAL, ownerId: rep.id, days: 30 },
    { name: 'Bluepeak annual plan', leadId: leads[1].id, value: '17200', stage: DealStage.PROSPECTING, ownerId: manager.id, days: 45 },
    { name: 'Monarch brand system', leadId: leads[3].id, value: '29400', stage: DealStage.WON, ownerId: manager.id, days: -5 },
    { name: 'Atlas onboarding', leadId: leads[5].id, value: '12800', stage: DealStage.PROPOSAL, ownerId: rep.id, days: 12 },
    { name: 'Fieldnotes launch', leadId: leads[2].id, value: '9600', stage: DealStage.PROSPECTING, ownerId: rep.id, days: 60 },
  ];
  const deals = await Promise.all(dealData.map(async ({ name, leadId, value, stage, ownerId, days }) => {
    const deal = await prisma.deal.upsert({ where: { id: `seed-${name.toLowerCase().replaceAll(' ', '-')}` }, update: {}, create: { id: `seed-${name.toLowerCase().replaceAll(' ', '-')}`, name, leadId, value, stage, ownerId, expectedCloseDate: new Date(Date.now() + days * 86400000) } });
    await prisma.dealStageHistory.upsert({ where: { id: `seed-history-${deal.id}` }, update: {}, create: { id: `seed-history-${deal.id}`, dealId: deal.id, fromStage: null, toStage: stage, changedById: admin.id } });
    return deal;
  }));
  const taskData = [
    { title: 'Share proposal draft', description: 'Send the first proposal and collect feedback.', dueIn: 1, assigneeId: rep.id, leadId: leads[0].id, priority: TaskPriority.HIGH },
    { title: 'Follow up on discovery', description: 'Confirm priorities and agree on next steps.', dueIn: 2, assigneeId: manager.id, leadId: leads[1].id, priority: TaskPriority.MEDIUM },
    { title: 'Prepare kickoff outline', description: 'Draft a concise plan for the first workshop.', dueIn: 4, assigneeId: rep.id, dealId: deals[1].id, priority: TaskPriority.MEDIUM },
    { title: 'Send revised estimate', description: 'Include the requested implementation options.', dueIn: -1, assigneeId: rep.id, dealId: deals[4].id, priority: TaskPriority.HIGH },
  ];
  await Promise.all(taskData.map(async ({ title, description, dueIn, assigneeId, leadId, dealId, priority }) => {
    await prisma.task.upsert({ where: { id: `seed-task-${title.toLowerCase().replaceAll(' ', '-')}` }, update: {}, create: { id: `seed-task-${title.toLowerCase().replaceAll(' ', '-')}`, title, description, dueDate: new Date(Date.now() + dueIn * 86400000), assigneeId, leadId, dealId, priority, status: TaskStatus.PENDING } });
  }));
  console.log('Seeded demo users, leads, deals, stage history, and tasks.');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
