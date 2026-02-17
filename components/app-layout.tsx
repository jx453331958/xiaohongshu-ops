'use client';

import { ResponsiveLayout } from './layouts/responsive-layout';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
