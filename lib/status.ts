import { ArticleStatus } from '@/types/article';

/**
 * 允许的状态转换
 */
const allowedTransitions: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ['pending_render', 'archived'],
  pending_render: ['pending_review', 'draft', 'archived'],
  pending_review: ['published', 'pending_render', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};

/**
 * 验证状态转换是否允许
 */
export function canTransitionTo(
  currentStatus: ArticleStatus,
  newStatus: ArticleStatus
): boolean {
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * 获取允许的下一状态列表
 */
export function getAllowedNextStatuses(currentStatus: ArticleStatus): ArticleStatus[] {
  return allowedTransitions[currentStatus] || [];
}
