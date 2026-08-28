/**
 * NewsCard.js
 * A single news article card component.
 * Renders as HTML string for efficient list rendering.
 */

import { formatRelativeTime } from '../../utils/formatters.js';

export function renderNewsCard(article, index) {
  const sentimentClass = `news-card--${article.sentiment}`;
  const tagsHtml = (article.tags || [])
    .slice(0, 3)
    .map((tag) => `<span class="news-tag">${tag}</span>`)
    .join('');

  const sentimentEmoji = {
    positive: '▲',
    negative: '▼',
    neutral: '●',
  }[article.sentiment] || '●';

  return `
    <article
      class="news-card ${sentimentClass} animate-fadeInUp stagger-${Math.min(index + 1, 8)}"
      data-news-id="${article.id}"
      data-url="${article.url}"
      role="article"
      tabindex="0"
      aria-label="${article.title}"
    >
      <div class="news-card__meta">
        <span class="news-card__source">${article.source}</span>
        <span class="news-card__time" title="${new Date(article.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}">
          ${formatRelativeTime(article.publishedAt)}
        </span>
      </div>

      <h3 class="news-card__title">${article.title}</h3>

      ${article.summary
        ? `<p class="news-card__summary">${article.summary}</p>`
        : ''}

      <div class="news-card__footer">
        <div class="news-card__tags">
          ${tagsHtml}
        </div>
        <span class="sentiment-badge ${article.sentiment}">
          ${sentimentEmoji} ${article.sentiment}
        </span>
      </div>
    </article>
  `;
}
