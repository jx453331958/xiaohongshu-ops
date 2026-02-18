'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useAppConfig } from '@/components/app-config-provider';
import { Form, Input, Button, App } from 'antd';
import { LockOutlined, LoginOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const appConfig = useAppConfig();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setToken: saveToken } = useAuthStore();
  const { message } = App.useApp();

  const handleLogin = async (values: { token: string }) => {
    const { token } = values;
    if (!token.trim()) {
      message.warning('请输入 Token');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/articles?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        saveToken(token);
        router.push('/dashboard');
      } else {
        message.error('Token 无效，请重试');
      }
    } catch {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'radial-gradient(circle at 50% 50%, rgba(26, 22, 37, 1) 0%, rgba(15, 13, 21, 1) 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(45, 40, 57, 0.9)',
        border: '1px solid rgba(212, 165, 116, 0.2)',
        borderRadius: 16,
        padding: 40,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #FF2442 0%, #FF6B8A 100%)',
            boxShadow: '0 8px 24px rgba(255, 36, 66, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 32,
            color: 'white',
          }}>
            <LoginOutlined />
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>
            {appConfig.name}
          </h1>
          <p style={{ color: '#B4A9C3', margin: 0, fontSize: 14 }}>
            {appConfig.subtitle}
          </p>
        </div>

        <Form onFinish={handleLogin} layout="vertical" size="large">
          <Form.Item
            name="token"
            label={<span style={{ color: '#F5F3F7' }}><LockOutlined style={{ color: '#D4A574', marginRight: 6 }} />访问 Token</span>}
            rules={[{ required: true, message: '请输入访问 Token' }]}
          >
            <Input.Password placeholder="请输入访问 token" disabled={loading} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
