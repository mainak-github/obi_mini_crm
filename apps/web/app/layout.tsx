import type { Metadata } from 'next';
import { GlobalFeedbackProvider } from '@/components/providers/feedback-provider';
import './styles.css';

export const metadata: Metadata = {
  title: 'OBI CRM — Sales, in a good place',
  description: 'A friendly workspace for thoughtful sales teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><GlobalFeedbackProvider>{children}</GlobalFeedbackProvider></body></html>;
}
