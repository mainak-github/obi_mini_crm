'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarCheck2, CalendarDays, Check, CheckCircle2, ChevronDown, CirclePlus, Clock3, ListFilter, Plus, Sprout, Target, Timer, UsersRound, X } from 'lucide-react';
import { useGlobalFeedback } from '@/components/providers/global-feedback';
import { ActionMenu } from '@/components/ui/action-menu';
import { ACCESS_TOKEN_KEY, api, Deal, Lead, Task, USER_KEY, User } from '@/lib/api';

const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
type LeadPage = { data: Lead[] };
type AssignableUser = { id: string; name: string; email: string };

export default function TasksPage() {
  const router = useRouter(); const params = useSearchParams();
  const { confirm, showAlert } = useGlobalFeedback();
  const [tasks, setTasks] = useState<Task[]>([]); const [leads, setLeads] = useState<Lead[]>([]); const [deals, setDeals] = useState<Deal[]>([]);
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED'>('ALL'); const [modal, setModal] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM', leadId: '', dealId: '', assigneeId: '' });
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) { router.replace('/login'); return; }
    setLoading(true); setError('');
    try {
      const [taskData, leadData, dealData] = await Promise.all([api<Task[]>('/tasks', {}, token), api<LeadPage>('/leads?limit=100', {}, token), api<Deal[]>('/deals', {}, token)]);
      setTasks(taskData); setLeads(leadData.data); setDeals(dealData);
      const stored = localStorage.getItem(USER_KEY); if (stored) {
        const currentUser = JSON.parse(stored) as User;
        setUser(currentUser);
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SALES_MANAGER') setAssignableUsers(await api<AssignableUser[]>('/users/assignable', {}, token));
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your follow-ups.'); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (params.get('new') === '1') { setModal(true); router.replace('/tasks'); } }, [params, router]);
  async function updateTask(task: Task, status: string) {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    try { await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status, version: task.version }) }, token); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this task.'); }
  }
  async function removeTask(task: Task) {
    const accepted = await confirm({ title: 'Delete this follow-up?', message: `“${task.title}” will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete follow-up', destructive: true });
    if (!accepted) return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    try { await api(`/tasks/${task.id}`, { method: 'DELETE' }, token); showAlert('Follow-up deleted.', 'success'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete this follow-up.'); }
  }
  function openCreate() {
    setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', leadId: '', dealId: '', assigneeId: '' });
    setModal(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const token = localStorage.getItem(ACCESS_TOKEN_KEY); if (!token) return;
    setSaving(true); setError('');
    try {
      await api('/tasks', { method: 'POST', body: JSON.stringify({ ...form, dueDate: new Date(form.dueDate).toISOString(), leadId: form.leadId || undefined, dealId: form.dealId || undefined, assigneeId: form.assigneeId || undefined }) }, token);
      setModal(false); setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', leadId: '', dealId: '', assigneeId: '' }); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this follow-up.'); }
    finally { setSaving(false); }
  }
  const now = new Date();
  const visible = tasks.filter((task) => {
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    if (filter === 'UPCOMING') return task.status !== 'COMPLETED' && new Date(task.dueDate) >= now && new Date(task.dueDate) <= new Date(Date.now() + 7 * 86400000);
    if (filter === 'OVERDUE') return task.status !== 'COMPLETED' && new Date(task.dueDate) < now;
    return true;
  });
  const upcoming = tasks.filter((task) => task.status !== 'COMPLETED' && new Date(task.dueDate) >= now && new Date(task.dueDate) <= new Date(Date.now() + 7 * 86400000)).length;
  const overdue = tasks.filter((task) => task.status !== 'COMPLETED' && new Date(task.dueDate) < now).length;
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const isManager = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER';

  return <div className="records-page tasks-page"><div className="records-heading"><div><div className="section-overline"><span className="overline-icon"><CalendarCheck2 size={13}/></span> SMALL PROMISES, KEPT</div><h1>The follow-through <span>✳</span></h1><p>Thoughtful reminders for the things—and people—that matter.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={16}/> Add a follow-up</button></div>
    <div className="task-summary"><div className="task-summary-title"><span className="task-summary-icon"><Sprout size={16}/></span><span><strong>A good week, one step at a time.</strong><small>Every reminder is a relationship in progress.</small></span></div><div className="task-summary-divider"/><div className="task-summary-metric"><span className="summary-metric-number summary-upcoming">{upcoming}</span><span>Coming up</span></div><div className="task-summary-metric"><span className={`summary-metric-number ${overdue ? 'summary-overdue' : ''}`}>{overdue}</span><span>Overdue</span></div><div className="task-summary-metric"><span className="summary-metric-number summary-completed">{completed}</span><span>Completed</span></div><span className="task-summary-star">✧</span></div>
    {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load()}>Try again</button></div>}
    <div className="task-filters">{([{ key: 'ALL', label: 'Everything', icon: ListFilter }, { key: 'UPCOMING', label: 'Coming up', icon: CalendarDays }, { key: 'OVERDUE', label: 'Overdue', icon: Clock3 }, { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 }] as const).map(({ key, label, icon: Icon }) => <button key={key} className={`task-filter ${filter === key ? 'task-filter-active' : ''}`} onClick={() => setFilter(key)}><Icon size={15}/>{label}<span>{key === 'ALL' ? tasks.length : key === 'UPCOMING' ? upcoming : key === 'OVERDUE' ? overdue : completed}</span></button>)}</div>
    <section className="tasks-list-panel"><div className="tasks-list-heading"><div><h2>{filter === 'ALL' ? 'Your follow-ups' : filter === 'UPCOMING' ? 'Coming up this week' : filter === 'OVERDUE' ? 'Worth a little attention' : 'Look at all you have done'}</h2><p>{isManager ? 'Your team’s promises to keep.' : 'Your promises, all in one place.'}</p></div><span className="tasks-sort-label"><Timer size={14}/> Due date</span></div>
      {loading ? <div className="task-list-skeleton">{[1, 2, 3, 4].map((item) => <div key={item}><i/><span/><span/></div>)}</div> : visible.length ? <div className="tasks-full-list">{visible.map((task, index) => { const isOverdue = task.status !== 'COMPLETED' && new Date(task.dueDate) < now; const isToday = new Date(task.dueDate).toDateString() === now.toDateString(); return <article className={`task-full-item ${task.status === 'COMPLETED' ? 'task-complete' : ''}`} key={task.id}><button className={`task-check ${task.status === 'COMPLETED' ? 'task-checked' : ''}`} title={task.status === 'COMPLETED' ? 'Mark as pending' : 'Mark as complete'} aria-label={`${task.status === 'COMPLETED' ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => void updateTask(task, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}>{task.status === 'COMPLETED' && <Check size={14}/>}</button><div className={`task-kind-icon task-kind-${index % 4}`}>{task.deal ? <Target size={16}/> : <UsersRound size={16}/>}</div><div className="task-main-copy"><strong>{task.title}</strong><span>{task.description || task.lead?.name || task.deal?.name || 'Follow-up'}{task.lead && task.description ? ` · ${task.lead.name}` : ''}{task.deal && task.description ? ` · ${task.deal.name}` : ''}</span></div><span className={`task-priority priority-${task.priority.toLowerCase()}`}><i/>{task.priority.toLowerCase()}</span><span className={`task-due-full ${isOverdue ? 'due-overdue' : isToday ? 'due-today' : ''}`}><CalendarDays size={14}/>{isOverdue ? 'Overdue · ' : isToday ? 'Today · ' : ''}{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><label className="task-status-select"><select aria-label={`Status of ${task.title}`} value={task.status} onChange={(event) => void updateTask(task, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ').toLowerCase()}</option>)}</select><ChevronDown size={13}/></label><ActionMenu label={`Actions for ${task.title}`} items={[{ label: task.status === 'COMPLETED' ? 'Reopen follow-up' : 'Mark as complete', icon: Check, onSelect: () => void updateTask(task, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED') }, { label: 'Delete follow-up', icon: X, destructive: true, separatorBefore: true, onSelect: () => void removeTask(task) }]} /></article>; })}</div> : <div className="tasks-empty-large"><span className="tasks-empty-mark"><CalendarCheck2 size={22}/></span><h3>{filter === 'OVERDUE' ? 'Nothing overdue. That is a good feeling.' : filter === 'COMPLETED' ? 'Your next little win is waiting.' : 'A bit of room to breathe.'}</h3><p>{filter === 'ALL' ? 'Add a follow-up so the important things get a little attention.' : 'There is nothing here just now. Check another view, or add a follow-up.'}</p>{filter !== 'COMPLETED' && <button className="button button-primary" onClick={() => setModal(true)}><Plus size={14}/> Add a follow-up</button>}</div>}
    </section><div className="records-footer"><span><Sprout size={13}/> Showing up is a little thing that means a lot.</span><span>Times are shown in your local timezone.</span></div>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="form-modal"><div className="modal-heading"><div><span className="modal-icon"><CalendarCheck2 size={17}/></span><div><div className="panel-eyebrow">MAKE A SMALL PROMISE</div><h2>Add a follow-up</h2></div></div><button className="icon-button" aria-label="Close" onClick={() => setModal(false)}><X size={19}/></button></div><p className="modal-copy">A thoughtful reminder keeps a good conversation going.</p><form className="record-form" onSubmit={submit}><label>What needs doing? <span>*</span><input required minLength={2} maxLength={140} placeholder="e.g. Send over a first draft" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></label><label>A little more context<input maxLength={2000} placeholder="Anything useful to remember…" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label><div className="form-row"><label>Due date <span>*</span><input required type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })}/></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="LOW">A nice-to-have</option><option value="MEDIUM">Worth doing</option><option value="HIGH">Needs attention</option></select></label></div><div className="form-row"><label>For a lead<select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value, dealId: '' })}><option value="">No lead selected</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label><label>For a deal<select value={form.dealId} onChange={(event) => setForm({ ...form, dealId: event.target.value, leadId: '' })}><option value="">No deal selected</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</select></label></div>{isManager && <label>Assignee<select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">You</option>{assignableUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label>}<div className="form-hint"><Sprout size={13}/>{isManager ? 'Choose the teammate responsible for this follow-up.' : 'You’ll be the one to keep this promise.'}</div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModal(false)}>Maybe later</button><button disabled={saving || (!form.leadId && !form.dealId)} className="button button-primary">{saving ? 'Saving…' : 'Save this reminder'}<ArrowRight size={15}/></button></div>{!form.leadId && !form.dealId && <small className="form-validation-hint">Choose a lead or deal to link this follow-up to.</small>}</form></section></div>}
  </div>;
}
