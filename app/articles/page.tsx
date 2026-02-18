'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { apiRequest } from '@/lib/api-client';
import { Article } from '@/types/article';
import { Table, Button, Input, Space, List, Card, Spin, Modal, App, Typography, Segmented } from 'antd';
import { PlusOutlined, SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AppLayout } from '@/components/app-layout';
import { StatusTag, getStatusLabel } from '@/components/status-tag';
import { useIsMobile } from '@/components/hooks/use-breakpoint';
import { PageHeader } from '@/components/mobile-page-header';

const { Title, Text } = Typography;

const statusFilterOptions = [
  { value: '', label: '全部' },
  { value: 'pending_review', label: '待审核' },
  { value: 'pending_render', label: '待渲染' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

// 状态排序优先级（数字越小越靠前）
const STATUS_PRIORITY: Record<string, number> = {
  pending_review: 0,
  pending_render: 1,
  draft: 2,
  published: 3,
  archived: 4,
};

export default function ArticlesPage() {
  const router = useRouter();
  const { token, ready } = useAuth();
  const { message, modal } = App.useApp();
  const isMobile = useIsMobile();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createTitle, setCreateTitle] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // 按状态优先级排序，同状态内按更新时间倒序
  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [articles]);

  useEffect(() => {
    if (!ready) return;
    loadArticles();
  }, [ready, statusFilter]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const data = await apiRequest<{ articles: Article[] }>(`/api/articles?${params.toString()}`);
      setArticles(data.articles);
    } catch {
      message.error('加载文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadArticles();
  };

  const handleCreateArticle = async () => {
    if (!createTitle.trim()) {
      message.warning('请输入文章标题');
      return;
    }
    try {
      setCreating(true);
      const article = await apiRequest<Article>('/api/articles', {
        method: 'POST',
        body: JSON.stringify({ title: createTitle, content: '' }),
      });
      setCreateModalOpen(false);
      setCreateTitle('');
      router.push(`/articles/${article.id}`);
    } catch (error: any) {
      message.error(error.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const columns: ColumnsType<Article> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <Link href={`/articles/${record.id}`} style={{ color: '#F5F3F7' }}>{text}</Link>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) =>
        tags.length > 0
          ? tags.slice(0, 3).map((t) => `#${t}`).join(' ')
          : '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text) => new Date(text).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Link href={`/articles/${record.id}`}>
          <Button type="link" size="small">编辑</Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <div>
        {isMobile ? (
          <PageHeader title="文章管理" />
        ) : (
          <PageHeader
            title="文章管理"
            subtitle="管理你的所有内容"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                新建文章
              </Button>
            }
          />
        )}

        {isMobile ? (
          <div style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索标题或内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={handleSearch}
              style={{ marginBottom: 8 }}
              allowClear
            />
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Segmented
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as string)}
                options={statusFilterOptions}
                size="small"
                block
              />
            </div>
          </div>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <Space wrap style={{ width: '100%' }}>
              <Input.Search
                placeholder="搜索标题或内容..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 300 }}
                allowClear
              />
              <Segmented
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as string)}
                options={statusFilterOptions}
              />
            </Space>
          </Card>
        )}

        {isMobile ? (
          <List
            loading={loading}
            dataSource={sortedArticles}
            locale={{ emptyText: <div style={{ padding: 40 }}><FileTextOutlined style={{ fontSize: 48, color: '#7A6F8A', display: 'block', marginBottom: 16 }} />暂无文章</div> }}
            renderItem={(article) => (
              <Link href={`/articles/${article.id}`} style={{ display: 'block', marginBottom: 8 }}>
                <Card size="small" hoverable style={{ borderRadius: 12 }}>
                  <div style={{ padding: '2px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <Text strong style={{ flex: 1, color: '#F5F3F7', fontSize: 15 }} ellipsis>{article.title}</Text>
                      <StatusTag status={article.status} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {article.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(article.created_at).toLocaleDateString('zh-CN')}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            )}
          />
        ) : (
          <Card>
            <Table
              columns={columns}
              dataSource={sortedArticles}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: '暂无文章' }}
            />
          </Card>
        )}

        {/* Mobile FAB */}
        {isMobile && (
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{
              position: 'fixed',
              right: 20,
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              width: 52,
              height: 52,
              minWidth: 52,
              minHeight: 52,
              fontSize: 20,
              zIndex: 99,
              boxShadow: '0 4px 16px rgba(255, 36, 66, 0.4)',
            }}
          />
        )}

        <Modal
          title="新建文章"
          open={createModalOpen}
          onOk={handleCreateArticle}
          onCancel={() => { setCreateModalOpen(false); setCreateTitle(''); }}
          confirmLoading={creating}
          okText="创建"
          cancelText="取消"
        >
          <Input
            placeholder="请输入文章标题"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            onPressEnter={handleCreateArticle}
            autoFocus
          />
        </Modal>
      </div>
    </AppLayout>
  );
}
