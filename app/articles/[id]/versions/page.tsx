'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { apiRequest } from '@/lib/api-client';
import { ArticleVersion } from '@/types/article';
import { Timeline, Card, Button, Tag, Spin, Row, Col, Descriptions, Typography, App } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/app-layout';
import { useIsMobile } from '@/components/hooks/use-breakpoint';
import { PageHeader } from '@/components/mobile-page-header';

const { Title, Text, Paragraph } = Typography;

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, ready } = useAuth();
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);

  useEffect(() => {
    if (!ready) return;
    loadVersions();
  }, [id, ready]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ versions: ArticleVersion[] }>(`/api/articles/${id}/versions`);
      setVersions(data.versions);
      if (data.versions.length > 0) {
        setSelectedVersion(data.versions[0]);
      }
    } catch (error: any) {
      message.error(error.message || '加载版本历史失败');
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

  const timelineItems = versions.map((version, index) => ({
    key: version.id,
    color: selectedVersion?.id === version.id ? '#FF2442' : '#7A6F8A',
    dot: selectedVersion?.id === version.id ? <ClockCircleOutlined style={{ color: '#FF2442' }} /> : undefined,
    children: (
      <div
        onClick={() => setSelectedVersion(version)}
        style={{
          cursor: 'pointer',
          padding: 14,
          borderRadius: 12,
          minHeight: 44,
          border: selectedVersion?.id === version.id ? '1px solid rgba(255, 36, 66, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
          background: selectedVersion?.id === version.id ? 'rgba(255, 36, 66, 0.06)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Tag color={selectedVersion?.id === version.id ? '#FF2442' : undefined}>
            版本 {version.version_num}
          </Tag>
          {index === 0 && <Tag color="success">最新</Tag>}
        </div>
        <Text strong style={{ display: 'block', marginBottom: 4 }} ellipsis>{version.title}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(version.created_at).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          })}
        </Text>
      </div>
    ),
  }));

  const detailContent = selectedVersion ? (
    <div>
      <Descriptions column={isMobile ? 1 : 2} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="版本号">
          <Tag>版本 {selectedVersion.version_num}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(selectedVersion.created_at).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          })}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>标题</Text>
        <Title level={5} style={{ margin: 0 }}>{selectedVersion.title}</Title>
      </div>

      <div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>内容</Text>
        <Card size="small" style={{ maxHeight: 500, overflow: 'auto' }}>
          {selectedVersion.content ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0, fontFamily: 'monospace', color: '#B4A9C3' }}>
              {selectedVersion.content}
            </pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7A6F8A' }}>(无内容)</div>
          )}
        </Card>
      </div>
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#7A6F8A' }}>
      <FileTextOutlined style={{ fontSize: 48, display: 'block', marginBottom: 16 }} />
      请从左侧时间线中选择一个版本
    </div>
  );

  return (
    <AppLayout>
      <div>
        <PageHeader
          title="版本历史"
          subtitle={`共 ${versions.length} 个版本`}
          extra={
            <Link href={`/articles/${id}`}>
              <Button icon={<ArrowLeftOutlined />}>返回编辑</Button>
            </Link>
          }
        />

        {isMobile ? (
          <div>
            <Card title="时间线" style={{ marginBottom: 16 }}>
              <Timeline items={timelineItems} />
            </Card>
            <Card title={selectedVersion ? `版本 ${selectedVersion.version_num} 详情` : '版本详情'}>
              {detailContent}
            </Card>
          </div>
        ) : (
          <Row gutter={16}>
            <Col span={8}>
              <Card title={<span><ClockCircleOutlined style={{ marginRight: 8, color: '#FF2442' }} />时间线</span>}>
                <div style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                  <Timeline items={timelineItems} />
                </div>
              </Card>
            </Col>
            <Col span={16}>
              <Card title={selectedVersion ? `版本 ${selectedVersion.version_num} 详情` : '版本详情'}>
                {detailContent}
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </AppLayout>
  );
}
