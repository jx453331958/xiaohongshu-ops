'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { apiRequest } from '@/lib/api-client';
import { Article } from '@/types/article';
import { Calendar, Card, List, Row, Col, Spin, Button, Badge, Typography, App } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Dayjs } from 'dayjs';
import { AppLayout } from '@/components/app-layout';
import { StatusTag } from '@/components/status-tag';
import { useIsMobile } from '@/components/hooks/use-breakpoint';

const { Title, Text } = Typography;

export default function CalendarPage() {
  const router = useRouter();
  const { token, ready } = useAuth();
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    loadArticles();
  }, [ready]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ articles: Article[] }>('/api/articles?limit=500');
      setArticles(data.articles);
    } catch (error: any) {
      message.error(error.message || '加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  const articlesOnSelectedDate = articles.filter((article) =>
    isSameDay(new Date(article.created_at), selectedDate)
  );

  const dateCellRender = (value: Dayjs) => {
    const date = value.toDate();
    const count = articles.filter((a) => isSameDay(new Date(a.created_at), date)).length;
    if (count === 0) return null;
    return <Badge count={count} size="small" style={{ backgroundColor: '#FF2442' }} />;
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

  return (
    <AppLayout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>内容日历</Title>
            <Text type="secondary">查看和管理内容时间线</Text>
          </div>
          <Link href="/articles">
            <Button icon={<FileTextOutlined />}>查看全部文章</Button>
          </Link>
        </div>

        {isMobile ? (
          <Card title="最近文章">
            <List
              dataSource={articles.slice(0, 10)}
              locale={{ emptyText: '暂无文章' }}
              renderItem={(article) => (
                <List.Item extra={<StatusTag status={article.status} />}>
                  <List.Item.Meta
                    title={<Link href={`/articles/${article.id}`} style={{ color: '#F5F3F7' }}>{article.title}</Link>}
                    description={
                      <span>
                        {new Date(article.created_at).toLocaleString('zh-CN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        {article.tags.length > 0 && (
                          <span style={{ marginLeft: 8, color: '#7A6F8A' }}>
                            {article.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                          </span>
                        )}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        ) : (
          <Row gutter={16}>
            <Col span={16}>
              <Card>
                <Calendar
                  cellRender={(current, info) => {
                    if (info.type === 'date') return dateCellRender(current);
                    return null;
                  }}
                  onSelect={(date) => setSelectedDate(date.toDate())}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
                extra={<Text type="secondary">{articlesOnSelectedDate.length} 篇</Text>}
              >
                <List
                  dataSource={articlesOnSelectedDate}
                  locale={{ emptyText: '该日期无文章' }}
                  renderItem={(article) => (
                    <List.Item extra={<StatusTag status={article.status} />}>
                      <List.Item.Meta
                        title={<Link href={`/articles/${article.id}`} style={{ color: '#F5F3F7' }}>{article.title}</Link>}
                        description={
                          <span>
                            {new Date(article.created_at).toLocaleTimeString('zh-CN', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                            {article.tags.length > 0 && (
                              <span style={{ marginLeft: 8, color: '#7A6F8A' }}>
                                {article.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                              </span>
                            )}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </AppLayout>
  );
}
