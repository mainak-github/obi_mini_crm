import { AppShell } from '@/components/layout/app-shell';

export default function DealsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
