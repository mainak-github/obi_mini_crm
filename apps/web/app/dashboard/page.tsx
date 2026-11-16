'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, ArrowUpRight, CalendarClock, Check, ChevronDown, CircleHelp, Clock3, Filter, Flame, Plus, RefreshCw, Sprout, Target, TrendingUp, Users, UsersRound, Zap } from 'lucide-react';
import { ACCESS_TOKEN_KEY, api, Deal, Lead, Task, USER_KEY, User } from '@/lib/api';

type Overview = {
  metrics: { totalLeads: number; activeDeals: number; wonDealValue: string; pipelineValue: string };
  leadsByStatus: Record<string, number>;
  upcomingTasks: Task[];
  recentLeads: Lead[];
};

const stages = [
  { key: 'NEW', label: 'New', color: 'var(--status-new)' },
  { key: 'CONTACTED', label: 'Contacted', color: 'var(--status-contacted)' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'var(--status-qualified)' },
  { key: 'CONVERTED', label: 'Converted', color: 'var(--status-converted)' },
  { key: 'LOST', label: 'Lost', color: 'var(--status-lost)' },
];

function money(value: string | number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: Number(value) >= 1000000 ? 'compact' : 'standard' }).format(Number(value));
}
function initials(name: string): string { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }

function LeadsStatusBars({ values }: { values: Record<string, number> }) {
  const max = Math.max(...stages.map((stage) => values[stage.key] ?? 0), 1);
  return <div className="status-chart" role="img" aria-label="Lead counts by status shown as comparable horizontal bars">
    {stages.map((stage) => <div className="status-row" key={stage.key}>
      <span className="status-name"><i style={{ background: stage.color }}/>{stage.label}</span>
      <div className="status-track"><div className="status-bar" style={{ width: `${(values[stage.key] ?? 0) / max * 100}%`, background: stage.color }}><span className="bar-tooltip">{values[stage.key] ?? 0} {stage.label.toLowerCase()} leads</span></div></div>
      <span className="status-value">{values[stage.key] ?? 0}</span>
    </div>)}
  </div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null); const [deals, setDeals] = useState<Deal[]>([]);
  const [user, setUser] = useState<User | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('Last 30 days'); const [rangeOpen, setRangeOpen] = useState(false); const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) { router.replace('/login'); return; }
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const [data, dealData] = await Promise.all([api<Overview>('/dashboard/overview', {}, token), api<Deal[]>('/deals', {}, token)]);
      setOverview(data); setDeals(dealData);
      const stored = localStorage.getItem(USER_KEY); if (stored) setUser(JSON.parse(stored) as User);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your dashboard.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useEffect(() => { void load(); }, [load]);
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const pipeline = deals.filter((deal) => !['WON', 'LOST'].includes(deal.stage));
  const averageDeal = pipeline.length ? pipeline.reduce((sum, deal) => sum + Number(deal.value), 0) / pipeline.length : 0;
  const taskCount = overview?.upcomingTasks.length ?? 0;

  return <div className="dashboard-page">
    <div className="dashboard-topline"><div className="greeting-copy"><div className="greeting-date"><span className="date-spark"><Sprout size={13}/></span>{today}<span className="date-dot">·</span> Your workspace at a glance</div><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}<span className="wave">✳</span></h1><p>A fresh look at the relationships you’re building.</p></div><div className="dashboard-actions"><button className="button button-quiet" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''}/><span>Refresh</span></button><button className="button button-primary" onClick={() => router.push('/leads?new=1')}><Plus size={16}/><span>Add a lead</span></button></div></div>
    <section className="welcome-banner"><div className="banner-copy"><div className="banner-eyebrow"><span className="banner-spark"><Sprout size={13}/></span> YOUR LITTLE CORNER OF THE INTERNET</div><h2>Good things grow<br/><em>with a little follow-up.</em></h2><p>{taskCount ? `You have ${taskCount} ${taskCount === 1 ? 'follow-up' : 'follow-ups'} coming up this week. You’ve got this.` : 'Stay close to the people who make your work matter.'}</p><button className="banner-link" onClick={() => router.push('/tasks')}>See your follow-ups <ArrowRight size={15}/></button></div><div className="banner-art" aria-hidden="true"><span className="art-orbit orbit-a"/><span className="art-orbit orbit-b"/><span className="art-sun"><Sprout size={30}/></span><span className="art-leaf leaf-a"/><span className="art-leaf leaf-b"/><span className="art-leaf leaf-c"/><span className="art-leaf leaf-d"/><span className="art-star star-a">✳</span><span className="art-star star-b">✦</span><span className="art-star star-c">·</span></div><div className="banner-glow"/></section>
    {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load()}><RefreshCw size={14}/> Try again</button></div>}
    <div className="section-toolbar"><div><div className="section-overline"><span className="overline-icon"><Activity size={13}/></span> YOUR NUMBERS</div><h2 className="section-heading">The big picture <span className="heading-period">/ {range.toLowerCase()}</span></h2></div><div className="toolbar-right"><div className="range-wrap"><button className="range-button" onClick={() => setRangeOpen(!rangeOpen)}><CalendarClock size={15}/>{range}<ChevronDown size={14}/></button>{rangeOpen && <div className="range-menu">{['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Month to date'].map((item) => <button key={item} className={range === item ? 'range-selected' : ''} onClick={() => { setRange(item); setRangeOpen(false); }}><span>{item}</span>{range === item && <Check size={15}/>}</button>)}</div>}</div><button className="icon-button filter-icon" title="Filter dashboard"><Filter size={16}/></button></div></div>
    <section className="metric-grid" aria-label="Business metrics">
      <article className="metric-card metric-leads"><div className="metric-top"><span className="metric-label">All your leads</span><span className="metric-icon metric-icon-lavender"><UsersRound size={18}/></span></div><div className="metric-value">{loading ? '—' : (overview?.metrics.totalLeads ?? 0).toLocaleString()}</div><div className="metric-foot"><span className="metric-caption">People in your world</span><span className="metric-trend trend-calm"><ArrowUpRight size={13}/> Here to grow</span></div><div className="mini-spark spark-lavender" aria-hidden="true"><svg viewBox="0 0 96 28" preserveAspectRatio="none"><path d="M1 22 C12 20 13 9 23 13 S38 21 47 12 S61 17 68 9 S83 14 95 3"/></svg></div></article>
      <article className="metric-card metric-active"><div className="metric-top"><span className="metric-label">Active opportunities</span><span className="metric-icon metric-icon-peach"><Target size={18}/></span></div><div className="metric-value">{loading ? '—' : (overview?.metrics.activeDeals ?? 0).toLocaleString()}</div><div className="metric-foot"><span className="metric-caption">Deals still in motion</span><span className="metric-trend trend-warm"><Flame size={13}/> Keeping warm</span></div><div className="mini-spark spark-peach" aria-hidden="true"><svg viewBox="0 0 96 28" preserveAspectRatio="none"><path d="M1 23 C11 23 16 16 24 19 S38 11 46 16 S57 18 65 8 S81 13 95 4"/></svg></div></article>
      <article className="metric-card metric-revenue"><div className="metric-top"><span className="metric-label">Won this quarter</span><span className="metric-icon metric-icon-sage"><Check size={18}/></span></div><div className="metric-value metric-currency">{loading ? '—' : money(overview?.metrics.wonDealValue ?? 0)}</div><div className="metric-foot"><span className="metric-caption">Good work, made real</span><span className="metric-trend trend-green"><ArrowUpRight size={13}/> Closed won</span></div><div className="mini-spark spark-sage" aria-hidden="true"><svg viewBox="0 0 96 28" preserveAspectRatio="none"><path d="M1 22 C14 22 15 16 25 18 S39 20 48 12 S62 17 69 7 S81 11 95 3"/></svg></div></article>
      <article className="metric-card metric-pipeline"><div className="metric-top"><span className="metric-label">Pipeline value</span><span className="metric-icon metric-icon-blue"><TrendingUp size={18}/></span></div><div className="metric-value metric-currency">{loading ? '—' : money(overview?.metrics.pipelineValue ?? 0)}</div><div className="metric-foot"><span className="metric-caption">{pipeline.length} active deals</span><span className="metric-trend trend-blue"><ArrowUpRight size={13}/> {money(averageDeal)} avg.</span></div><div className="mini-spark spark-blue" aria-hidden="true"><svg viewBox="0 0 96 28" preserveAspectRatio="none"><path d="M1 22 C12 21 17 10 25 14 S41 21 49 13 S62 15 69 9 S83 8 95 2"/></svg></div></article>
    </section>
    <div className="insight-grid"><section className="panel leads-panel"><div className="panel-heading"><div><div className="panel-eyebrow">A LITTLE OF EVERYTHING</div><h3>Leads, by where they are</h3><p>Every conversation starts somewhere.</p></div><button className="panel-action" onClick={() => router.push('/leads')}>All leads <ArrowRight size={15}/></button></div>{loading ? <div className="skeleton-chart" aria-label="Loading lead status chart"><i/><i/><i/><i/><i/></div> : <LeadsStatusBars values={overview?.leadsByStatus ?? {}}/>}<div className="chart-footnote"><span><span className="chart-live-dot"/> Live from your workspace</span><button onClick={() => router.push('/leads')}>See all <ArrowUpRight size={13}/></button></div><div className="chart-screenreader" aria-live="polite">{stages.map((stage) => `${stage.label}: ${overview?.leadsByStatus[stage.key] ?? 0}`).join('. ')}</div></section>
      <section className="panel tasks-panel"><div className="panel-heading"><div><div className="panel-eyebrow">COMING UP</div><h3>Keep the good things going</h3><p>A few gentle nudges for this week.</p></div><button className="panel-action" onClick={() => router.push('/tasks')}>All tasks <ArrowRight size={15}/></button></div>{loading ? <div className="task-skeleton"><i/><i/><i/></div> : overview?.upcomingTasks.length ? <div className="upcoming-list">{overview.upcomingTasks.slice(0, 4).map((task, index) => <div className="upcoming-item" key={task.id}><div className={`task-dot task-dot-${index % 4}`}><CalendarClock size={15}/></div><div className="task-info"><strong>{task.title}</strong><span>{task.lead?.name ?? task.deal?.name ?? 'Follow-up'}</span></div><div className={`task-due ${new Date(task.dueDate).toDateString() === new Date().toDateString() ? 'due-today' : ''}`}><Clock3 size={12}/>{new Date(task.dueDate).toDateString() === new Date().toDateString() ? 'Today' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>)}</div> : <div className="tasks-empty"><span className="empty-orbit"><Sprout size={20}/></span><strong>A little breathing room.</strong><span>No follow-ups in the next week.</span></div>}<button className="add-task-link" onClick={() => router.push('/tasks?new=1')}><span><Plus size={14}/></span>Add a follow-up</button></section></div>
    <div className="lower-grid"><section className="panel recent-panel"><div className="panel-heading panel-heading-compact"><div><div className="panel-eyebrow">JUST STOPPED BY</div><h3>New faces</h3></div><button className="panel-action" onClick={() => router.push('/leads')}>Meet everyone <ArrowRight size={15}/></button></div>{loading ? <div className="recent-skeleton"><i/><i/><i/></div> : overview?.recentLeads.length ? <div className="recent-list">{overview.recentLeads.map((lead, index) => <button key={lead.id} className="recent-item" onClick={() => router.push('/leads')}><div className={`avatar lead-avatar lead-avatar-${index % 5}`}>{initials(lead.name)}</div><div className="recent-person"><strong>{lead.name}</strong><span>{lead.company ?? lead.email}</span></div><span className={`lead-stage-pill lead-pill-${lead.status.toLowerCase()}`}>{lead.status.toLowerCase()}</span><span className="recent-source">{lead.source ?? '—'}</span><ArrowUpRight className="recent-arrow" size={15}/></button>)}</div> : <div className="empty-inline">A good time to say hello to someone new.</div>}</section>
      <aside className="nudge-card"><div className="nudge-top"><span className="nudge-icon"><Zap size={16}/></span><span>ONE THING TO NOTICE</span></div><h3>Little steps add up.</h3><p>{pipeline.length ? `Your ${money(Number(overview?.metrics.pipelineValue ?? 0))} in active opportunities is worth a little attention today.` : 'Start a conversation. You never know where it might lead.'}</p><button onClick={() => router.push('/deals')}>Take a look <ArrowRight size={14}/></button><span className="nudge-orbit nudge-orbit-one"/><span className="nudge-orbit nudge-orbit-two"/></aside></div>
    <footer className="dashboard-footer"><span><Sprout size={13}/> Made for people who care about people.</span><button onClick={() => window.open('http://localhost:4000/api/docs', '_blank', 'noopener,noreferrer')}><CircleHelp size={13}/> Need a hand?</button></footer>
  </div>;
}
