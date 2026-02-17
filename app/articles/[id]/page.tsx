'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/use-auth';
import { apiRequest, uploadFile } from '@/lib/api-client';
import { Article, ArticleImage, ArticleStatus } from '@/types/article';
import { Button, Input, Card, Tabs, Space, Modal, Upload, Spin, Typography, App } from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HistoryOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PictureOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AppLayout } from '@/components/app-layout';
import { XhsMarkdownPreview } from '@/components/xhs-markdown-preview';
import { StatusTag, getStatusLabel } from '@/components/status-tag';
import { useIsMobile } from '@/components/hooks/use-breakpoint';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const { Title, Text } = Typography;

const statusConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  draft: { label: '草稿', icon: <FileTextOutlined /> },
  pending_render: { label: '待渲染', icon: <ClockCircleOutlined /> },
  pending_review: { label: '待审核', icon: <ClockCircleOutlined /> },
  published: { label: '已发布', icon: <CheckCircleOutlined /> },
  archived: { label: '已归档', icon: <FileTextOutlined /> },
};

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, ready } = useAuth();
  const { message, modal } = App.useApp();
  const isMobile = useIsMobile();
  const [article, setArticle] = useState<Article | null>(null);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [allowedStatuses, setAllowedStatuses] = useState<ArticleStatus[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    loadArticle();
    loadImages();
    loadAllowedStatuses();
  }, [id, ready]);

  const loadArticle = async () => {
    try {
      const data = await apiRequest<Article>(`/api/articles/${id}`);
      setArticle(data);
      setTitle(data.title);
      setContent(data.content || '');
      setTags(data.tags.join(', '));
      setCategory(data.category || '');
    } catch (error: any) {
      message.error(error.message || '加载文章失败');
      router.push('/articles');
    }
  };

  const loadImages = async () => {
    try {
      const data = await apiRequest<{ images: ArticleImage[] }>(`/api/articles/${id}/images`);
      setImages(data.images);
    } catch {}
  };

  const loadAllowedStatuses = async () => {
    try {
      const data = await apiRequest<{ allowed_next_statuses: ArticleStatus[] }>(`/api/articles/${id}/status`);
      setAllowedStatuses(data.allowed_next_statuses);
    } catch {}
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const updated = await apiRequest<Article>(`/api/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, tags: tagArray, category: category || null }),
      });
      setArticle(updated);
      message.success('保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const image = await uploadFile(`/api/articles/${id}/images`, file, {
        sort_order: String(images.length),
      });
      setImages([...images, image]);
      message.success('上传成功');
    } catch (error: any) {
      message.error(error.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    modal.confirm({
      title: '确定删除这张图片吗？',
      onOk: async () => {
        try {
          await apiRequest(`/api/articles/${id}/images?image_id=${imageId}`, { method: 'DELETE' });
          setImages(images.filter((img) => img.id !== imageId));
          message.success('删除成功');
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  const handleChangeStatus = async (newStatus: ArticleStatus) => {
    const config = statusConfig[newStatus];
    modal.confirm({
      title: `确定将状态改为"${config?.label || newStatus}"吗？`,
      onOk: async () => {
        try {
          const data = await apiRequest<{ article: Article }>(`/api/articles/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus }),
          });
          setArticle(data.article);
          loadAllowedStatuses();
          message.success('状态更新成功');
        } catch (error: any) {
          message.error(error.message || '状态更新失败');
        }
      },
    });
  };

  const handlePublish = async () => {
    let noteId = '';
    modal.confirm({
      title: '发布到小红书',
      content: (
        <Input
          placeholder="请输入小红书 note_id"
          onChange={(e) => { noteId = e.target.value; }}
        />
      ),
      onOk: async () => {
        if (!noteId) {
          message.warning('请输入 note_id');
          return;
        }
        try {
          const data = await apiRequest<{ article: Article }>(`/api/articles/${id}/publish`, {
            method: 'POST',
            body: JSON.stringify({ xhs_note_id: noteId }),
          });
          setArticle(data.article);
          loadAllowedStatuses();
          message.success('发布成功');
        } catch (error: any) {
          message.error(error.message || '发布失败');
        }
      },
    });
  };

  if (!article) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </AppLayout>
    );
  }

  // 编辑内容区
  const editContent = (
    <div>
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>标题</Text>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入文章标题" />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>标签（逗号分隔）</Text>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AI工具, 新闻" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>分类</Text>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="输入分类" />
            </div>
          </div>
        </Space>
      </Card>

      {isMobile ? (
        <Card title="内容">
          <div data-color-mode="dark">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={350}
              preview="edit"
              hideToolbar
            />
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Card title="编辑" style={{ flex: 1 }}>
            <div data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                height={600}
                preview="edit"
              />
            </div>
          </Card>
          <Card title="预览" style={{ flex: 1, overflow: 'auto' }}>
            <XhsMarkdownPreview
              source={content}
              images={images.map((img) => ({ id: img.id, url: img.url }))}
            />
          </Card>
        </div>
      )}
    </div>
  );

  // 预览内容区（移动端 Tab）
  const previewContent = (
    <Card>
      <XhsMarkdownPreview
        source={content}
        images={images.map((img) => ({ id: img.id, url: img.url }))}
      />
    </Card>
  );

  // 图片管理内容区
  const imagesContent = (
    <div>
      <Card title="上传图片" style={{ marginBottom: 16 }}>
        <Space>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadImage}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          >
            选择图片
          </Button>
          {uploading && <Text type="secondary">上传中...</Text>}
        </Space>
      </Card>

      {images.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#7A6F8A' }}>
            <PictureOutlined style={{ fontSize: 48, display: 'block', marginBottom: 16 }} />
            暂无图片
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {images.map((image) => (
            <Card
              key={image.id}
              cover={
                <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#252032' }}>
                  <img
                    src={image.url}
                    alt="文章图片"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
              }
              size="small"
              actions={[
                <DeleteOutlined
                  key="delete"
                  style={{ color: '#DC2626' }}
                  onClick={() => handleDeleteImage(image.id)}
                />,
              ]}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(image.created_at).toLocaleDateString('zh-CN')}
              </Text>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // 状态管理内容区
  const statusContent = (
    <div>
      <Card title="当前状态" style={{ marginBottom: 16 }}>
        <Space>
          {statusConfig[article.status]?.icon}
          <StatusTag status={article.status} />
        </Space>
      </Card>

      <Card title="状态转换" style={{ marginBottom: 16 }}>
        {allowedStatuses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#7A6F8A' }}>暂无可用的状态转换</div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {allowedStatuses.map((status) => {
              const config = statusConfig[status];
              return (
                <Button
                  key={status}
                  block
                  icon={config?.icon}
                  onClick={() => handleChangeStatus(status)}
                >
                  转换到：{config?.label || status}
                </Button>
              );
            })}
          </Space>
        )}
      </Card>

      {article.status === 'pending_review' && (
        <Card title="发布到小红书">
          <Button type="primary" danger block icon={<CheckCircleOutlined />} onClick={handlePublish}>
            记录发布信息
          </Button>
        </Card>
      )}
    </div>
  );

  const tabItems = isMobile
    ? [
        { key: 'edit', label: '编辑', children: editContent },
        { key: 'preview', label: '预览', children: previewContent },
        { key: 'images', label: '图片', children: imagesContent },
        { key: 'status', label: '状态', children: statusContent },
      ]
    : [
        { key: 'edit', label: '编辑', children: editContent },
        { key: 'images', label: '图片', children: imagesContent },
        { key: 'status', label: '状态', children: statusContent },
      ];

  return (
    <AppLayout>
      <div>
        {/* 顶部操作栏 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <Space>
            <Link href="/articles">
              <Button icon={<ArrowLeftOutlined />} type="text" />
            </Link>
            <StatusTag status={article.status} />
            {!isMobile && <Text strong ellipsis style={{ maxWidth: 300 }}>{title}</Text>}
          </Space>
          <Space>
            <Link href={`/articles/${id}/versions`}>
              <Button icon={<HistoryOutlined />} type="text">版本</Button>
            </Link>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存
            </Button>
          </Space>
        </div>

        <Tabs defaultActiveKey="edit" items={tabItems} />
      </div>
    </AppLayout>
  );
}
