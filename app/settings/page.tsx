'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/app-layout';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  return (
    <AppLayout>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>设置</Title>
        <Text type="secondary">管理你的账户和偏好设置</Text>

        <Card
          style={{ marginTop: 24 }}
          title={
            <span>
              <SettingOutlined style={{ marginRight: 8, color: '#7A6F8A' }} />
              系统设置
            </span>
          }
        >
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#7A6F8A' }}>
            设置功能即将推出...
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
