'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { useAuthStore } from '@/lib/store';
import { apiRequest } from '@/lib/api-client';
import { Article } from '@/types/article';
import { Row, Col, Card, Statistic, List, Button, Spin, Typography, App } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { AppLayout } from '@/components/app-layout';
import { StatusTag, getStatusLabel } from '@/components/status-tag';
import { useAppConfig } from '@/components/app-config-provider';

const { Title, Text } = Typography;

interface DashboardStats {
  draft: number;
  pending_render: number;
  pending_review: number;
  published: number;
  archived: number;
}

const statsConfig = [
  { key: 'draft', label: '草稿', icon: <FileTextOutlined />, color: '#8B7E99' },
  { key: 'pending_review', label: '待审核', icon: <ClockCircleOutlined />, color: '#3B82F6' },
  { key: 'published', label: '已发布', icon: <CheckCircleOutlined />, color: '#10B981' },
  { key: 'archived', label: '已归档', icon: <InboxOutlined />, color: '#F97316' },
];

export default function DashboardPage() {
  const appConfig = useAppConfig();
  const router = useRouter();
  const { token, ready } = useAuth();
  const { clearToken } = useAuthStore();
  const { message } = App.useApp();
  const [stats, setStats] = useState<DashboardStats>({
    draft: 0, pending_render: 0, pending_review: 0, published: 0, archived: 0,
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    loadDashboard();
  }, [ready]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const statusKeys = ['draft', 'pending_render', 'pending_review', 'published', 'archived'];
      const statsPromises = statusKeys.map(async (status) => {
        const data = await apiRequest<{ total: number }>(`/api/articles?status=${status}&limit=1`);
        return { status, count: data.total };
      });

      const statsResults = await Promise.all(statsPromises);
      const newStats = statsResults.reduce((acc, { status, count }) => {
        acc[status as keyof DashboardStats] = count;
        return acc;
      }, {} as DashboardStats);
      setStats(newStats);

      const articlesData = await apiRequest<{ articles: Article[] }>('/api/articles?limit=10');
      setRecentArticles(articlesData.articles);
    } catch {
      message.error('加载失败，请重新登录');
      clearToken();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </AppLayout>
    );
  }

  const totalArticles = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return (
    <AppLayout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>仪表盘</Title>
            <Text type="secondary">{`欢迎回到${appConfig.name}后台`}</Text>
          </div>
          <Link href="/articles">
            <Button type="primary" icon={<PlusOutlined />}>新建文章</Button>
          </Link>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="总文章数"
                value={totalArticles}
                prefix={<FireOutlined style={{ color: '#FF2442' }} />}
              />
            </Card>
          </Col>
          {statsConfig.map((item) => (
            <Col xs={12} md={6} key={item.key}>
              <Card>
                <Statistic
                  title={item.label}
                  value={stats[item.key as keyof DashboardStats]}
                  prefix={<span style={{ color: item.color }}>{item.icon}</span>}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          title="最近文章"
          extra={<Link href="/articles"><Button type="link">查看全部</Button></Link>}
        >
          <List
            dataSource={recentArticles}
            locale={{ emptyText: '暂无文章' }}
            renderItem={(article) => (
              <List.Item
                extra={<StatusTag status={article.status} />}
              >
                <List.Item.Meta
                  title={<Link href={`/articles/${article.id}`} style={{ color: '#F5F3F7' }}>{article.title}</Link>}
                  description={
                    <span>
                      {new Date(article.created_at).toLocaleString('zh-CN', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {article.tags.length > 0 && (
                        <span style={{ marginLeft: 8, color: '#7A6F8A' }}>
                          {article.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}
                        </span>
                      )}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
