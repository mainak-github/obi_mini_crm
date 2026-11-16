'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp, Building2, ChevronDown, CirclePlus, Filter, Mail, Pencil, Phone, Plus, Search, SlidersHorizontal, Sprout, Trash2, UsersRound, X } from 'lucide-react';
import { ACCESS_TOKEN_KEY, api, Lead, USER_KEY, User } from '@/lib/api';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { ActionMenu } from '@/components/ui/action-menu';
import { useGlobalFeedback } from '@/components/providers/feedback-provider';

const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
type LeadPage = { data: Lead[]; meta: { page: number; limit: number; total: number; totalPages: number } };
type LeadDetails = Lead & {
  assignedTo?: { id: string; name: string; email: string } | null;
  deals?: Array<{ id: string; name: string; stage: string; value: string }>;
  tasks?: Array<{ id: string; title: string; status: string; dueDate: string }>;
  updatedAt: string;
};

export default function LeadsPage() {
  const router = useRouter(); const params = useSearchParams();
  const { confirm, showAlert } = useGlobalFeedback();
  const [result, setResult] = useState<LeadPage | null>(null); const [query, setQuery] = useState(''); const [status, setStatus] = useState('');
  const [page, setPage] = useState(1); const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const routeSearch = params.get('search') ?? '';
  useEffect(() => {
    setQuery(routeSearch);
    setPage(1);
  }, [routeSearch]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.toolbar-search input')?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [modal, setModal] = useState(false); const [saving, setSaving] = useState(false); const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; company: string; source: string; status: string; assignedToId: string; version: number }>({ name: '', email: '', phone: '', company: '', source: '', status: 'NEW', assignedToId: '', version: 0 });
  const [editing, setEditing] = useState<Lead | null>(null);
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const token = typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_TOKEN_KEY);

  const load = useCallback(async () => {
    const authToken = localStorage.getItem(ACCESS_TOKEN_KEY); if (!authToken) { router.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const search = new URLSearchParams({ page: String(page), limit: '12', sortBy: 'createdAt', sortOrder });
      if (query.trim()) search.set('search', query.trim()); if (status) search.set('status', status);
      setResult(await api<LeadPage>(`/leads?${search.toString()}`, {}, authToken));
      const stored = localStorage.getItem(USER_KEY); if (stored) {
        const currentUser = JSON.parse(stored) as User;
        setUser(currentUser);
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SALES_MANAGER') setAssignableUsers(await api<Array<{ id: string; name: string; email: string }>>('/users/assignable', {}, authToken));
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load leads.'); }
    finally { setLoading(false); }
  }, [page, query, router, sortOrder, status]);

  useEffect(() => { const handle = window.setTimeout(() => { void load(); }, 180); return () => window.clearTimeout(handle); }, [load]);
  useEffect(() => { if (params.get('new') === '1') { setEditing(null); setForm({ name: '', email: '', phone: '', company: '', source: '', status: 'NEW', assignedToId: '', version: 0 }); setModal(true); router.replace('/leads'); } }, [params, router]);
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', source: '', status: 'NEW', assignedToId: '', version: 0 });
    setModal(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({ name: lead.name, email: lead.email, phone: lead.phone ?? '', company: lead.company ?? '', source: lead.source ?? '', status: lead.status, assignedToId: lead.assignedTo?.id ?? '', version: lead.version });
    setModal(true);
  };
  const openLeadDetails = async (lead: Lead) => {
    const authToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!authToken) { router.replace('/login'); return; }
    setDetailsOpen(true);
    setLeadDetails(null);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      setLeadDetails(await api<LeadDetails>(`/leads/${lead.id}`, {}, authToken));
    } catch (caught) {
      setDetailsError(caught instanceof Error ? caught.message : 'Could not load this lead.');
    } finally {
      setDetailsLoading(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const authToken = localStorage.getItem(ACCESS_TOKEN_KEY); if (!authToken) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone || null,
        company: form.company || null, source: form.source || null, status: form.status,
        ...(editing ? { version: editing.version } : {}),
        ...(isManager ? { assignedToId: form.assignedToId || null } : {}),
      };
      await api(editing ? `/leads/${editing.id}` : '/leads', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }, authToken);
      setModal(false); setEditing(null); setForm({ name: '', email: '', phone: '', company: '', source: '', status: 'NEW', assignedToId: '', version: 0 });
      showAlert(editing ? 'Lead updated.' : 'Your new lead is in good hands.', 'success'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this lead.'); }
    finally { setSaving(false); }
  };
  const removeLead = async (lead: Lead) => {
    const accepted = await confirm({ title: 'Delete this lead?', message: `“${lead.name}” and its linked records will be removed. This cannot be undone.`, confirmLabel: 'Delete lead', destructive: true });
    if (!accepted) return;
    const authToken = localStorage.getItem(ACCESS_TOKEN_KEY); if (!authToken) return;
    try { await api(`/leads/${lead.id}`, { method: 'DELETE' }, authToken); showAlert('Lead deleted.', 'success'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete this lead.'); }
  };
  const isManager = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER';
  const toggleSort = () => { setSortOrder((current) => current === 'desc' ? 'asc' : 'desc'); setPage(1); };
  const columns: DataTableColumn<Lead>[] = [
    { key: 'person', header: 'Person', render: (lead, index) => <div className="table-person"><span className={`avatar lead-avatar lead-avatar-${index % 5}`}>{lead.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{lead.name}</strong><small>{lead.email}</small></span></div> },
    { key: 'company', header: 'Company', render: (lead) => <span className="company-cell"><Building2 size={14}/>{lead.company ?? 'Independent'}</span> },
    { key: 'status', header: 'Status', render: (lead) => <span className={`lead-stage-pill lead-pill-${lead.status.toLowerCase()}`}><i/>{lead.status.toLowerCase()}</span> },
    { key: 'owner', header: 'Owner', render: (lead) => <span className="owner-cell"><span className="owner-avatar">{lead.assignedTo?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? '—'}</span>{lead.assignedTo?.name ?? 'Unassigned'}</span> },
    { key: 'source', header: 'Source', render: (lead) => <span className="source-cell">{lead.source ?? '—'}</span> },
    { key: 'added', header: 'Added', sortable: true, render: (lead) => <span className="date-cell">{new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
    { key: 'actions', header: 'Actions', className: 'table-actions-cell', render: (lead) => <ActionMenu label={`Actions for ${lead.name}`} items={[{ label: 'Edit lead', icon: Pencil, onSelect: () => openEdit(lead) }, { label: 'Email lead', icon: Mail, onSelect: () => { window.location.href = `mailto:${lead.email}`; } }, ...(lead.phone ? [{ label: 'Call lead', icon: Phone, onSelect: () => { window.location.href = `tel:${lead.phone}`; } }] : []), { label: 'View lead details', icon: UsersRound, onSelect: () => void openLeadDetails(lead) }, { label: 'Delete lead', icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => void removeLead(lead) }]} /> },
  ];

  return <div className="records-page"><div className="records-heading"><div><div className="section-overline"><span className="overline-icon"><UsersRound size={13}/></span> RELATIONSHIPS FIRST</div><h1>People worth knowing <span>✳</span></h1><p>A thoughtful place for every hello, follow-up, and future.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={16}/> Add a lead</button></div>
    <div className="lead-summary-strip"><div className="summary-copy"><span className="summary-spark"><Sprout size={15}/></span><span><strong>{result?.meta.total ?? '—'}</strong> people in your corner</span></div><div className="summary-right"><span className="summary-note">Good work starts with a good conversation.</span><span className="summary-decoration">✦</span></div></div>
    {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load()}>Try again</button></div>}
    <section className="records-panel"><div className="records-toolbar"><div className="toolbar-search"><Search size={17}/><input placeholder="Find someone by name, company, email…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}<kbd>/</kbd></div><div className="toolbar-filters"><label className="select-filter"><Filter size={15}/><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Every status</option>{statuses.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select><ChevronDown size={14}/></label><button className="sort-button" onClick={toggleSort} title="Toggle sort direction"><SlidersHorizontal size={15}/><span>Newest first</span>{sortOrder === 'desc' ? <ArrowDown size={13}/> : <ArrowUp size={13}/>}</button></div></div>
      {loading ? <div className="lead-table-loading">{[1, 2, 3, 4, 5].map((item) => <div className="table-skeleton-row" key={item}><i/><span/><span/><span/></div>)}</div> : result?.data.length ? <DataTable rows={result.data} columns={columns} getRowKey={(lead) => lead.id} className="lead-table" label="Leads" pagination={{ page, pageCount: result.meta.totalPages, pageSize: result.meta.limit, total: result.meta.total, onPageChange: setPage }} sort={{ key: 'added', direction: sortOrder }} onSortChange={toggleSort}/> : <div className="empty-state"><span className="empty-state-icon"><UsersRound size={24}/></span><h3>{query || status ? 'No one quite like that yet.' : 'A lovely place to begin.'}</h3><p>{query || status ? 'Try a different search or choose another status.' : 'Add the first person you would like to get to know.'}</p>{!query && !status && <button className="button button-primary" onClick={openCreate}><CirclePlus size={15}/> Add your first lead</button>}</div>}
    </section>
    <div className="records-footer"><span>Keep it human. The best CRM is a little follow-through.</span><button onClick={() => window.open('http://localhost:4000/api/docs', '_blank', 'noopener,noreferrer')}>API docs <ArrowRight size={13}/></button></div>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="form-modal"><div className="modal-heading"><div><span className="modal-icon"><UsersRound size={17}/></span><div><div className="panel-eyebrow">{editing ? 'KEEP THE RECORD CURRENT' : 'MAKE A GOOD FIRST NOTE'}</div><h2>{editing ? 'Edit lead' : 'Add a new lead'}</h2></div></div><button className="icon-button" aria-label="Close" onClick={() => setModal(false)}><X size={19}/></button></div><p className="modal-copy">Just the essentials to start a meaningful conversation.</p><form className="record-form" onSubmit={submit}><label>Full name <span>*</span><input required minLength={2} maxLength={120} placeholder="e.g. Jamie Rivera" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Work email <span>*</span><input required type="email" placeholder="jamie@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><div className="form-row"><label>Company<input placeholder="Where they work" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })}/></label><label>Phone<input type="tel" placeholder="Optional" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label></div><div className="form-row"><label>How you met<input placeholder="Website, referral…" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}/></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></label></div>{isManager && <label>Assigned teammate<select value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })}><option value="">Unassigned</option>{assignableUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label>}<div className="form-hint"><Sprout size={13}/> {isManager ? 'Choose an owner now, or leave this lead unassigned.' : 'You’ll be the owner of this lead.'}</div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModal(false)}>Maybe later</button><button disabled={saving} className="button button-primary">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to your people'}<ArrowRight size={15}/></button></div></form></section></div>}
    {detailsOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDetailsOpen(false); setLeadDetails(null); setDetailsError(''); } }}><section className="form-modal lead-details-modal" role="dialog" aria-modal="true" aria-labelledby="lead-details-title"><div className="modal-heading"><div><span className="modal-icon"><UsersRound size={17}/></span><div><div className="panel-eyebrow">LEAD PROFILE</div><h2 id="lead-details-title">{leadDetails?.name ?? 'Lead details'}</h2></div></div><button className="icon-button" aria-label="Close lead details" onClick={() => { setDetailsOpen(false); setLeadDetails(null); setDetailsError(''); }}><X size={19}/></button></div>{detailsLoading ? <p className="lead-details-state" role="status">Loading lead details…</p> : detailsError ? <div className="lead-details-state lead-details-error" role="alert"><p>{detailsError}</p><button className="button button-quiet" onClick={() => { setDetailsOpen(false); setLeadDetails(null); setDetailsError(''); }}>Close</button></div> : leadDetails && <><div className="lead-detail-grid"><div><span>Email</span><a href={`mailto:${leadDetails.email}`}>{leadDetails.email}</a></div><div><span>Phone</span>{leadDetails.phone ? <a href={`tel:${leadDetails.phone}`}>{leadDetails.phone}</a> : <strong>—</strong>}</div><div><span>Company</span><strong>{leadDetails.company || '—'}</strong></div><div><span>Source</span><strong>{leadDetails.source || '—'}</strong></div><div><span>Status</span><strong className={`lead-stage-pill lead-pill-${leadDetails.status.toLowerCase()}`}>{leadDetails.status.toLowerCase()}</strong></div><div><span>Owner</span><strong>{leadDetails.assignedTo?.name ?? 'Unassigned'}</strong></div><div><span>Created</span><strong>{new Date(leadDetails.createdAt).toLocaleString()}</strong></div><div><span>Last updated</span><strong>{new Date(leadDetails.updatedAt).toLocaleString()}</strong></div></div><section className="lead-related-section"><h3>Deals <span>{leadDetails.deals?.length ?? 0}</span></h3>{leadDetails.deals?.length ? leadDetails.deals.map((deal) => <div className="lead-related-row" key={deal.id}><strong>{deal.name}</strong><span>{deal.stage.toLowerCase()} · {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(deal.value))}</span></div>) : <p>No linked deals.</p>}</section><section className="lead-related-section"><h3>Follow-ups <span>{leadDetails.tasks?.length ?? 0}</span></h3>{leadDetails.tasks?.length ? leadDetails.tasks.map((task) => <div className="lead-related-row" key={task.id}><strong>{task.title}</strong><span>{task.status.toLowerCase().replace('_', ' ')} · due {new Date(task.dueDate).toLocaleDateString()}</span></div>) : <p>No linked follow-ups.</p>}</section><div className="modal-actions"><button className="button button-quiet" onClick={() => { setDetailsOpen(false); setLeadDetails(null); setDetailsError(''); }}>Close</button><button className="button button-primary" onClick={() => { const selected = leadDetails; setDetailsOpen(false); setLeadDetails(null); openEdit(selected); }}>Edit lead <Pencil size={14}/></button></div></>}</section></div>}
  </div>;
}
