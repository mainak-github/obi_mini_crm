'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, BriefcaseBusiness, Menu, Search, UsersRound, X } from 'lucide-react';
import { ActionMenu } from '@/components/ui/action-menu';

export type Notice = { id: string; type: string; title: string; message: string; entityType: string; entityId: string; readAt?: string | null; createdAt: string };

const routes: Record<string, string> = {
  '/dashboard': 'Overview',
  '/leads': 'Leads',
  '/deals': 'Pipeline',
  '/tasks': 'Tasks & follow-ups',
};

export function Topbar({ notifications, noticeOpen, onToggleNotifications, onMarkRead, onOpenMenu }: {
  notifications: Notice[];
  noticeOpen: boolean;
  onToggleNotifications: () => void;
  onMarkRead: (notice: Notice) => void;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const current = routes[pathname] ?? 'Workspace';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/leads?search=${encodeURIComponent(query)}` : '/leads');
    setSearchOpen(false);
  };
  const quickCreate = [
    { label: 'New lead', icon: UsersRound, onSelect: () => router.push('/leads?new=1') },
    { label: 'New deal', icon: BriefcaseBusiness, onSelect: () => router.push('/deals?new=1') },
    { label: 'New follow-up', icon: Bell, onSelect: () => router.push('/tasks?new=1') },
  ];

  return <header className="topbar">
    <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={onOpenMenu}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{current}</strong></div></div>
    <div className="topbar-actions"><button className="search-shortcut" onClick={() => setSearchOpen((open) => !open)} aria-expanded={searchOpen}><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button><span className="topbar-divider"/><button className="icon-button notification-button" aria-label={`Notifications, ${unread} unread`} onClick={onToggleNotifications}><Bell size={19}/>{unread > 0 && <span className="notification-dot"/>}</button><ActionMenu label="Create new record" className="quick-add" items={quickCreate} triggerContent={<><span>New</span><span aria-hidden="true">⌄</span></>}/></div>
    {searchOpen && mounted && createPortal(<div className="global-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><form className="global-search-dialog" role="search" onSubmit={submitSearch}><Search size={19}/><input autoFocus type="search" placeholder="Search leads by name, company, or email…" ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Search leads"/><kbd>Enter</kbd><button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={17}/></button></form><p className="global-search-help">Search across leads. Press Escape to close.</p></div>, document.body)}
    {noticeOpen && <div className="notification-popover"><div className="popover-heading"><div><strong>Notifications</strong><span>{unread ? `${unread} new` : 'You’re all caught up'}</span></div><button className="icon-button" aria-label="Close notifications" onClick={onToggleNotifications}><X size={17}/></button></div>{notifications.length === 0 ? <div className="empty-notices"><Bell size={22}/><span>No notifications yet</span><small>Important updates will find their way here.</small></div> : <div className="notice-list">{notifications.slice(0, 8).map((notification) => <button className={`notice-item ${notification.readAt ? '' : 'notice-unread'}`} key={notification.id} onClick={() => { onMarkRead(notification); onToggleNotifications(); router.push(notification.entityType === 'deal' ? '/deals' : '/leads'); }}><span className={`notice-icon ${notification.type === 'DEAL_STAGE_CHANGED' ? 'notice-deal' : ''}`}>{notification.type === 'DEAL_STAGE_CHANGED' ? <BriefcaseBusiness size={16}/> : <UsersRound size={16}/>}</span><span className="notice-body"><strong>{notification.title}</strong><small>{notification.message}</small><time>{new Date(notification.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></span>{!notification.readAt && <i/>}</button>)}</div>}</div>}
  </header>;
}
