'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobalFeedback } from '@/components/providers/feedback-provider';
import { ActionMenu } from '@/components/ui/action-menu';
import { ArrowUpRight, BriefcaseBusiness, CalendarCheck2, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Sprout, UsersRound } from 'lucide-react';
import type { User } from '@/lib/api';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: UsersRound },
  { href: '/deals', label: 'Pipeline', icon: BriefcaseBusiness },
  { href: '/tasks', label: 'Tasks & follow-ups', icon: CalendarCheck2 },
];

export function Sidebar({ user, mobileNav, onClose, onSignOut }: {
  user: User;
  mobileNav: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useGlobalFeedback();
  const signOut = async () => {
    const accepted = await confirm({ title: 'Sign out of OBI CRM?', message: 'You will need to sign in again to access this workspace.', confirmLabel: 'Sign out' });
    if (accepted) onSignOut();
  };
  const workspaceItems = [
    { label: 'Help & API docs', icon: ArrowUpRight, onSelect: () => window.open('http://localhost:4000/api/docs', '_blank', 'noopener,noreferrer') },
  ];
  const profileItems = [
    { label: 'Sign out', icon: LogOut, destructive: true, onSelect: signOut },
  ];
  const initials = user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const workspaceInitial = user.name.trim().charAt(0).toUpperCase() || 'W';
  const workspaceName = user.name.split(' ').slice(-1)[0] ? `${user.name.split(' ').slice(-1)[0]}’s workspace` : 'My workspace';
  const roleLabel = user.role.replace('_', ' ').toLowerCase();
  const workspaceTrigger = <><div className="workspace-avatar">{workspaceInitial}</div><div className="workspace-label"><strong>{workspaceName}</strong><span>Growth workspace</span></div><ChevronDown size={15}/></>;
  const profileTrigger = <><div className="avatar avatar-profile">{initials}</div><div className="profile-info"><strong>{user.name}</strong><span>{roleLabel}</span></div><ChevronDown size={16}/></>;

  return <>
    {mobileNav && <button aria-label="Close navigation" className="mobile-scrim" onClick={onClose}/>}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <Link href="/dashboard" className="brand"><span className="brand-mark"><Sprout size={19}/></span><span>OBI<span className="brand-light"> CRM</span></span></Link>
      <ActionMenu label="Workspace options" className="workspace-switch" items={workspaceItems} triggerContent={workspaceTrigger}/>
      <div className="side-section-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${pathname === href ? 'nav-active' : ''}`}><Icon size={18} strokeWidth={pathname === href ? 2.1 : 1.8}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-glyph"><Sprout size={16}/></div><strong>Room to grow</strong><p>Your team’s doing lovely work. Keep it moving.</p><button onClick={() => router.push('/deals')}>Explore pipeline <ArrowUpRight size={14}/></button><span className="upgrade-decoration decoration-one"/><span className="upgrade-decoration decoration-two"/></div>
        <div className="sidebar-utilities"><span>SUPPORT</span><button className="nav-link support-link" onClick={() => window.open('http://localhost:4000/api/docs', '_blank', 'noopener,noreferrer')}><CircleHelp size={18}/><span>Help & API docs</span><ArrowUpRight size={14}/></button></div>
        <ActionMenu label="Account options" className="profile-row" items={profileItems} triggerContent={profileTrigger}/>
      </div>
    </aside>
  </>;
}
