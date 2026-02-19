'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { apiRequest } from '@/lib/api-client';
import { ArticleTemplate } from '@/types/article-template';
import { Table, Button, Input, Space, List, Card, Modal, App, Typography, Tag } from 'antd';
import { PlusOutlined, SnippetsOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AppLayout } from '@/components/app-layout';
import { useIsMobile } from '@/components/hooks/use-breakpoint';
import { PageHeader } from '@/components/mobile-page-header';

const { Text } = Typography;

const categoryLabels: Record<string, string> = {
  css_theme: 'CSS 主题',
  content_type: '内容类型',
};

export default function TemplatesPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const { message } = App.useApp();
  const isMobile = useIsMobile();

  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    loadTemplates();
  }, [ready]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.append('search', search);
      const data = await apiRequest<{ templates: ArticleTemplate[] }>(
        `/api/templates?${params.toString()}`
      );
      setTemplates(data.templates);
    } catch {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTemplates();
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      message.warning('请输入模板标题');
      return;
    }
    try {
      setCreating(true);
      const template = await apiRequest<ArticleTemplate>('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ title: createTitle, content: '' }),
      });
      setCreateModalOpen(false);
      setCreateTitle('');
      router.push(`/templates/${template.id}`);
    } catch (error: any) {
      message.error(error.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const columns: ColumnsType<ArticleTemplate> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <Link href={`/templates/${record.id}`} style={{ color: '#F5F3F7' }}>{text}</Link>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text ? (
        <Tag>{categoryLabels[text] || text}</Tag>
      ) : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) =>
        tags.length > 0 ? tags.slice(0, 3).map((t) => `#${t}`).join(' ') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text) => new Date(text).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Link href={`/templates/${record.id}`}>
          <Button type="link" size="small">编辑</Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <div>
        {isMobile ? (
          <PageHeader title="模板库" />
        ) : (
          <PageHeader
            title="模板库"
            subtitle="管理文章模板和 CSS 主题"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                新建模板
              </Button>
            }
          />
        )}

        {isMobile ? (
          <div style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={handleSearch}
              allowClear
            />
          </div>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Input.Search
                placeholder="搜索模板..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 300 }}
                allowClear
              />
            </Space>
          </Card>
        )}

        {isMobile ? (
          <List
            loading={loading}
            dataSource={templates}
            locale={{ emptyText: <div style={{ padding: 40 }}><SnippetsOutlined style={{ fontSize: 48, color: '#7A6F8A', display: 'block', marginBottom: 16 }} />暂无模板</div> }}
            renderItem={(template) => (
              <Link href={`/templates/${template.id}`} style={{ display: 'block', marginBottom: 8 }}>
                <Card size="small" hoverable style={{ borderRadius: 12 }}>
                  <div style={{ padding: '2px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <Text strong style={{ flex: 1, color: '#F5F3F7', fontSize: 15 }} ellipsis>{template.title}</Text>
                      {template.category && <Tag style={{ margin: 0 }}>{categoryLabels[template.category] || template.category}</Tag>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {template.description || template.tags.slice(0, 3).map((t) => `#${t}`).join(' ') || '-'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                        {new Date(template.updated_at).toLocaleString('zh-CN', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                        })}
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
              dataSource={templates}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: '暂无模板' }}
            />
          </Card>
        )}

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
          title="新建模板"
          open={createModalOpen}
          onOk={handleCreate}
          onCancel={() => { setCreateModalOpen(false); setCreateTitle(''); }}
          confirmLoading={creating}
          okText="创建"
          cancelText="取消"
        >
          <Input
            placeholder="请输入模板标题"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            onPressEnter={handleCreate}
            autoFocus
          />
        </Modal>
      </div>
    </AppLayout>
  );
}
