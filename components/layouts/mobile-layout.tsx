'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DashboardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const tabs = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/articles', icon: <FileTextOutlined />, label: '文章' },
  { key: '/calendar', icon: <CalendarOutlined />, label: '日历' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeKey = tabs.find(
    (t) => pathname === t.key || (t.key !== '/dashboard' && pathname.startsWith(t.key))
  )?.key || '/dashboard';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 70 }}>
      <main>{children}</main>

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 13, 21, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(212, 165, 116, 0.15)',
        padding: '6px 0',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 12px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 500,
                color: isActive ? '#FF2442' : '#7A6F8A',
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
