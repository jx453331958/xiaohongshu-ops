'use client';

import { Tag } from 'antd';

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending_render: { label: '待渲染', color: 'warning' },
  pending_review: { label: '待审核', color: 'processing' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'orange' },
};

export function StatusTag({ status }: { status: string }) {
  const config = statusMap[status] || { label: status, color: 'default' };
  return <Tag color={config.color}>{config.label}</Tag>;
}

export function getStatusLabel(status: string): string {
  return statusMap[status]?.label || status;
}
