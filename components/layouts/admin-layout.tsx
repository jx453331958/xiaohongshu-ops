'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/lib/store';
import { appConfig } from '@/lib/app-config';

const { Sider, Header, Content } = Layout;

const navItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link href="/dashboard">仪表盘</Link> },
  { key: '/articles', icon: <FileTextOutlined />, label: <Link href="/articles">文章管理</Link> },
  { key: '/calendar', icon: <CalendarOutlined />, label: <Link href="/calendar">内容日历</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link href="/settings">设置</Link> },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { clearToken } = useAuthStore();

  const activeKey = navItems.find(
    (item) => pathname === item.key || (item.key !== '/dashboard' && pathname.startsWith(item.key))
  )?.key || '/dashboard';

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: '1px solid rgba(212, 165, 116, 0.12)',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: '1px solid rgba(212, 165, 116, 0.12)',
        }}>
          <span style={{
            fontSize: collapsed ? 18 : 20,
            fontWeight: 700,
            fontFamily: "'Fraunces', 'Noto Serif SC', serif",
            background: 'linear-gradient(135deg, #FF2442, #FF6B8A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            whiteSpace: 'nowrap',
          }}>
            {collapsed ? appConfig.shortName : appConfig.name}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeKey]}
            items={navItems}
            style={{ flex: 1, borderRight: 0 }}
          />
          <Menu
            theme="dark"
            mode="inline"
            selectable={false}
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: handleLogout,
                danger: true,
              },
            ]}
            style={{ borderRight: 0, borderTop: '1px solid rgba(212, 165, 116, 0.12)' }}
          />
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(212, 165, 116, 0.12)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, cursor: 'pointer', color: '#B4A9C3' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
        </Header>
        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
