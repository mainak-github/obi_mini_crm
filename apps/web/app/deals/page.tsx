'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, CalendarDays, ChevronDown, DollarSign, Plus, Sprout, Target, TrendingUp, X } from 'lucide-react';
import { ActionMenu } from '@/components/ui/action-menu';
import { useGlobalFeedback } from '@/components/providers/feedback-provider';
import { ACCESS_TOKEN_KEY, api, Deal, Lead, USER_KEY, User } from '@/lib/api';

const columns = [
  { key: 'PROSPECTING', label: 'Prospecting', tone: 'stage-prospecting' },
  { key: 'PROPOSAL', label: 'Proposal', tone: 'stage-proposal' },
  { key: 'NEGOTIATION', label: 'Negotiation', tone: 'stage-negotiation' },
  { key: 'WON', label: 'Won', tone: 'stage-won' },
  { key: 'LOST', label: 'Lost', tone: 'stage-lost' },
];
const currency = (value: string | number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
const nextDealStage = (stage: string) => ({ PROSPECTING: 'PROPOSAL', PROPOSAL: 'NEGOTIATION', NEGOTIATION: 'WON', WON: 'PROSPECTING', LOST: 'PROSPECTING' }[stage] ?? 'PROSPECTING');
const nextDealAction = (stage: string) => ['WON', 'LOST'].includes(stage) ? 'Reopen in prospecting' : 'Move to next stage';

const dealStageLabels: Record<string, string> = { PROSPECTING: 'Prospecting', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };

type LeadResult = { data: Lead[] };

export default function DealsPage() {
  const router = useRouter(); const params = useSearchParams();
  const { confirm, showAlert } = useGlobalFeedback();
  const [deals, setDeals] = useState<Deal[]>([]); const [leads, setLeads] = useState<Lead[]>([]); const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', value: '', stage: 'PROSPECTING', expectedCloseDate: '', leadId: '', ownerId: '' });
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) { router.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const [dealData, leadData] = await Promise.all([api<Deal[]>('/deals', {}, token), api<LeadResult>('/leads?limit=100', {}, token)]);
      setDeals(dealData); setLeads(leadData.data.filter((lead) => lead.status === 'QUALIFIED'));
      const stored = localStorage.getItem(USER_KEY); if (stored) {
        const currentUser = JSON.parse(stored) as User;
        setUser(currentUser);
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SALES_MANAGER') setAssignableUsers(await api<Array<{ id: string; name: string; email: string }>>('/users/assignable', {}, token));
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your pipeline.'); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (params.get('new') === '1') { setModal(true); router.replace('/deals'); } }, [params, router]);

  async function moveDeal(deal: Deal, stage: string) {
    if (stage === deal.stage) return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    try { await api(`/deals/${deal.id}`, { method: 'PATCH', body: JSON.stringify({ stage, version: deal.version }) }, token); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this deal.'); }
  }
  function openCreate(stage = 'PROSPECTING') {
    setForm({ name: '', value: '', stage, expectedCloseDate: '', leadId: '', ownerId: '' });
    setModal(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    setSaving(true); setError('');
    try {
      await api('/deals', { method: 'POST', body: JSON.stringify({ name: form.name, value: Number(form.value), stage: form.stage, expectedCloseDate: form.expectedCloseDate || undefined, leadId: form.leadId || undefined, ...(isManager && form.ownerId ? { ownerId: form.ownerId } : {}) }) }, token);
      setModal(false); setForm({ name: '', value: '', stage: 'PROSPECTING', expectedCloseDate: '', leadId: '', ownerId: '' }); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this deal.'); }
    finally { setSaving(false); }
  }
  async function removeDeal(deal: Deal) {
    const accepted = await confirm({ title: 'Delete this deal?', message: `“${deal.name}” will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete deal', destructive: true });
    if (!accepted) return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    try { await api(`/deals/${deal.id}`, { method: 'DELETE' }, token); showAlert('Deal deleted.', 'success'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete this deal.'); }
  }

  const total = deals.filter((deal) => !['WON', 'LOST'].includes(deal.stage)).reduce((sum, deal) => sum + Number(deal.value), 0);
  const isManager = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER';

  return <div className="records-page deals-page"><div className="records-heading"><div><div className="section-overline"><span className="overline-icon"><Target size={13}/></span> GOOD THINGS IN MOTION</div><h1>The pipeline <span>✳</span></h1><p>Every opportunity, right where it belongs.</p></div><button className="button button-primary" onClick={() => openCreate()}><Plus size={16}/> New deal</button></div>
    <div className="pipeline-summary"><div className="pipeline-summary-main"><span className="pipeline-summary-icon"><TrendingUp size={18}/></span><span><small>ACTIVE PIPELINE</small><strong>{currency(total)}</strong></span></div><span className="pipeline-summary-divider"/><span className="pipeline-summary-stat"><strong>{deals.filter((deal) => !['WON', 'LOST'].includes(deal.stage)).length}</strong><small>opportunities<br/>in motion</small></span><span className="pipeline-summary-stat"><strong>{deals.filter((deal) => deal.stage === 'WON').length}</strong><small>good things<br/>closed won</small></span><span className="pipeline-summary-art">✳</span></div>
    {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load()}>Try again</button></div>}
    <div className="pipeline-board" aria-label="Sales pipeline by deal stage">{columns.map((column) => { const records = deals.filter((deal) => deal.stage === column.key); const columnTotal = records.reduce((sum, deal) => sum + Number(deal.value), 0); return <section className={`pipeline-column ${column.tone}`} key={column.key}><div className="column-heading"><div><span className="column-stage-dot"/><h2>{column.label}</h2><span className="column-count">{records.length}</span></div><strong>{currency(columnTotal)}</strong></div><div className="column-cards">{loading ? <><div className="deal-skeleton"/><div className="deal-skeleton"/></> : records.length ? records.map((deal, index) => <article className="deal-card" key={deal.id}><div className="deal-card-top"><span className="deal-card-kicker">{deal.lead?.name ?? 'Direct opportunity'}</span><ActionMenu label={`Actions for ${deal.name}`} items={[{ label: 'View deal details', icon: BriefcaseBusiness, onSelect: () => showAlert(`${deal.name} · ${currency(deal.value)}${deal.lead ? ` · ${deal.lead.name}` : ''}`) }, { label: `${nextDealAction(deal.stage)} (${dealStageLabels[nextDealStage(deal.stage)]})`, icon: TrendingUp, onSelect: () => void moveDeal(deal, nextDealStage(deal.stage)) }, { label: 'Delete deal', icon: X, destructive: true, separatorBefore: true, onSelect: () => void removeDeal(deal) }]} /></div><h3>{deal.name}</h3><div className="deal-card-value"><span>{currency(deal.value)}</span><span className="deal-value-icon"><DollarSign size={13}/></span></div><div className="deal-card-meta"><span className="deal-owner-avatar">{deal.owner?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? 'ME'}</span><span>{deal.owner?.name ?? 'You'}</span><span className="deal-meta-spacer"/>{deal.expectedCloseDate && <span className="deal-date"><CalendarDays size={12}/>{new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}</div><label className="move-stage">Move to <ChevronDown size={13}/><select aria-label={`Move ${deal.name} to another stage`} value={deal.stage} onChange={(event) => void moveDeal(deal, event.target.value)}>{columns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><span className={`deal-decor deal-decor-${index % 4}`}/></article>) : <div className="column-empty"><span className="column-empty-icon"><BriefcaseBusiness size={17}/></span><span>A good opportunity<br/>could go here.</span></div>}</div><button className="column-add" onClick={() => openCreate(column.key)}><Plus size={14}/> Add a deal</button></section>; })}</div>
    <div className="pipeline-note"><Sprout size={14}/><span>Moved something forward? Its stage history is saved automatically.</span><span className="pipeline-note-spacer"/><span>{isManager ? 'Team-wide view' : 'Your opportunities'}</span></div>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="form-modal"><div className="modal-heading"><div><span className="modal-icon"><BriefcaseBusiness size={17}/></span><div><div className="panel-eyebrow">A NEW POSSIBILITY</div><h2>Create a deal</h2></div></div><button className="icon-button" aria-label="Close" onClick={() => setModal(false)}><X size={19}/></button></div><p className="modal-copy">Start with the opportunity. The details can grow along the way.</p><form className="record-form" onSubmit={submit}><label>Deal name <span>*</span><input required minLength={2} maxLength={140} placeholder="e.g. Northstar brand refresh" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><div className="form-row"><label>Deal value · USD <span>*</span><input required type="number" min="0" step="0.01" placeholder="12,500" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })}/></label><label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>{columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label></div><label>Qualified lead <span className="optional-label">optional</span><select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })}><option value="">Direct opportunity</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.company ?? lead.email}</option>)}</select></label><label>Expected close date <span className="optional-label">optional</span><input type="date" value={form.expectedCloseDate} onChange={(event) => setForm({ ...form, expectedCloseDate: event.target.value })}/></label>{isManager && <label>Deal owner<select value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}><option value="">You</option>{assignableUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label>}<div className="form-hint"><Sprout size={13}/>{isManager ? 'Choose the teammate responsible for this opportunity.' : 'You’ll be the owner. Stage changes are saved to history.'}</div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModal(false)}>Maybe later</button><button disabled={saving} className="button button-primary">{saving ? 'Saving…' : 'Create opportunity'}<ArrowRight size={15}/></button></div></form></section></div>}
  </div>;
}
