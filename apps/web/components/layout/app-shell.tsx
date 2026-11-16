'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Sprout } from 'lucide-react';
import { ACCESS_TOKEN_KEY, API_URL, api, USER_KEY, User } from '@/lib/api';
import { useGlobalFeedback } from '@/components/providers/feedback-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar, type Notice } from '@/components/layout/topbar';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const { showAlert } = useGlobalFeedback();
  const [user, setUser] = useState<User | null>(null); const [mobileNav, setMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<Notice[]>([]); const [noticeOpen, setNoticeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async (token: string) => {
    try {
      const fetched = await api<Notice[]>('/notifications', {}, token);
      setNotifications((current) => {
        const byId = new Map(fetched.map((notice) => [notice.id, notice]));
        current.forEach((notice) => byId.set(notice.id, notice));
        return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50);
      });
    } catch { /* session expiry is handled by regular API calls */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY); const stored = localStorage.getItem(USER_KEY);
    if (!token || !stored) { router.replace('/login'); return; }
    try { setUser(JSON.parse(stored) as User); } catch { localStorage.removeItem(USER_KEY); router.replace('/login'); return; }
    setLoading(false); void refreshNotifications(token);
    const socket: Socket = io(`${API_URL.replace(/\/api\/?$/, '')}/notifications`, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('notification', (notice: Notice) => { showAlert(notice.title); setNotifications((previous) => [notice, ...previous.filter((item) => item.id !== notice.id)].slice(0, 50)); });
    return () => { socket.disconnect(); };
  }, [refreshNotifications, router, showAlert]);

  useEffect(() => { setMobileNav(false); }, [pathname]);
  const signOut = () => { localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(USER_KEY); router.push('/login'); };
  const markRead = async (notification: Notice) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || notification.readAt) return;
    try { await api(`/notifications/${notification.id}/read`, { method: 'PATCH' }, token); setNotifications((list) => list.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); } catch { /* keep the notification in the list for a retry */ }
  };

  if (loading || !user) return <div className="loading-screen"><span className="loading-logo"><Sprout size={20}/></span><span>Setting up your space…</span></div>;

  return <div className="workspace">
    <Sidebar user={user} mobileNav={mobileNav} onClose={() => setMobileNav(false)} onSignOut={signOut}/>
    <main className="main-area"><Topbar notifications={notifications} noticeOpen={noticeOpen} onToggleNotifications={() => setNoticeOpen((open) => !open)} onMarkRead={(notification) => { void markRead(notification); }} onOpenMenu={() => setMobileNav(true)}/>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellContent>{children}</AppShellContent>;
}
