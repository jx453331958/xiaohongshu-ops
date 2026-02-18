'use client';

import { useMemo } from 'react';
import { Image } from 'antd';

interface XhsMarkdownPreviewProps {
  source: string;
  images?: { id: string; url: string }[];
}

/**
 * 小红书风格 Markdown 预览组件
 * 将 markdown 内容渲染为温暖、卡片式、图文混排的小红书风格排版
 */
export function XhsMarkdownPreview({ source, images = [] }: XhsMarkdownPreviewProps) {
  const rendered = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className="xhs-preview">
      {/* 顶部装饰条 */}
      <div className="xhs-preview-header">
        <div className="xhs-preview-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="xhs-preview-meta">
          <span className="xhs-preview-author">作者</span>
          <span className="xhs-preview-date">内容预览</span>
        </div>
      </div>

      {/* 图片轮播区（如果有图片） */}
      {images.length > 0 && (
        <Image.PreviewGroup>
          <div className="xhs-preview-images">
            {images.map((img) => (
              <div key={img.id} className="xhs-preview-image-item">
                <Image src={img.url} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </Image.PreviewGroup>
      )}

      {/* 正文内容 */}
      <div
        className="xhs-preview-body"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />

      {/* 底部互动区 */}
      <div className="xhs-preview-footer">
        <div className="xhs-preview-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>赞</span>
        </div>
        <div className="xhs-preview-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>收藏</span>
        </div>
        <div className="xhs-preview-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>评论</span>
        </div>
        <div className="xhs-preview-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>分享</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 简易 markdown -> HTML 转换器
 * 针对小红书风格做了特殊处理：emoji强调、标签高亮等
 */
function parseMarkdown(md: string): string {
  if (!md) return '<p class="xhs-empty">还没有内容，开始写作吧~</p>';

  let html = md;

  // 转义 HTML（保留已有的 HTML 标签不转义，只转义裸文本中的特殊字符）
  // 先保护代码块
  const codeBlocks: string[] = [];
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(code);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // 图片 -> 小红书风格图片卡片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<div class="xhs-img-card"><img src="$2" alt="$1" loading="lazy" /><span class="xhs-img-caption">$1</span></div>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="xhs-link" target="_blank" rel="noopener">$1</a>');

  // 标题 -> 小红书风格标题（带装饰）
  html = html.replace(/^#### (.+)$/gm, '<h4 class="xhs-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="xhs-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="xhs-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="xhs-h1">$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="xhs-bold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="xhs-italic">$1</em>');

  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // 分割线
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<div class="xhs-divider"><span></span></div>');

  // 引用块 -> 小红书风格高亮卡片
  html = html.replace(/^> (.+)$/gm, '<blockquote class="xhs-quote">$1</blockquote>');
  // 合并连续引用
  html = html.replace(/<\/blockquote>\n<blockquote class="xhs-quote">/g, '<br/>');

  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="xhs-li">$1</li>');
  html = html.replace(/((?:<li class="xhs-li">.*<\/li>\n?)+)/g, '<ul class="xhs-ul">$1</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="xhs-oli">$1</li>');
  html = html.replace(/((?:<li class="xhs-oli">.*<\/li>\n?)+)/g, '<ol class="xhs-ol">$1</ol>');

  // 恢复代码块
  codeBlocks.forEach((block, i) => {
    const match = block.match(/```(\w*)\n?([\s\S]*?)```/);
    if (match) {
      const lang = match[1] || '';
      const code = match[2].replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = html.replace(`__CODE_BLOCK_${i}__`,
        `<div class="xhs-code-block"><div class="xhs-code-header"><span class="xhs-code-lang">${lang || 'code'}</span></div><pre><code>${code}</code></pre></div>`);
    }
  });

  // 恢复行内代码
  inlineCodes.forEach((code, i) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(`__INLINE_CODE_${i}__`,
      `<code class="xhs-inline-code">${escaped}</code>`);
  });

  // 小红书话题标签高亮 #话题#
  html = html.replace(/#([^#\s<][^#<]*?)#/g, '<span class="xhs-tag">#$1#</span>');

  // 段落处理：将连续非标签文本包裹在 <p> 中
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      continue;
    }

    const isBlock = /^<(h[1-4]|ul|ol|li|blockquote|div|pre|table)/.test(trimmed) ||
                    /^<\/(h[1-4]|ul|ol|li|blockquote|div|pre|table)/.test(trimmed);

    if (isBlock) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push('<p class="xhs-p">');
        inParagraph = true;
      } else {
        result.push('<br/>');
      }
      result.push(trimmed);
    }
  }
  if (inParagraph) {
    result.push('</p>');
  }

  return result.join('\n');
}
