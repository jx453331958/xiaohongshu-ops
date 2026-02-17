'use client';

import { useIsMobile } from '@/components/hooks/use-breakpoint';
import { AdminLayout } from './admin-layout';
import { MobileLayout } from './mobile-layout';

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
