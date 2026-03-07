import { useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { MOCK_FAQS } from '../../api/mock/data';
import './index.css';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'order', label: '订单问题' },
  { key: 'payment', label: '支付问题' },
  { key: 'coupon', label: '优惠问题' },
  { key: 'safety', label: '安全问题' },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeCategory === 'all'
    ? MOCK_FAQS
    : MOCK_FAQS.filter((f) => f.category === activeCategory);

  return (
    <div className="faq-page page-with-header">
      <PageHeader title="常见问题" />

      <div className="faq-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`faq-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="faq-list">
        {filtered.map((faq) => (
          <div
            key={faq.id}
            className={`faq-item ${expandedId === faq.id ? 'expanded' : ''}`}
          >
            <div className="faq-question" onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}>
              <span className="faq-q-icon">Q</span>
              <span className="faq-q-text">{faq.question}</span>
              <span className="faq-arrow">{expandedId === faq.id ? '收起' : '展开'}</span>
            </div>
            {expandedId === faq.id && (
              <div className="faq-answer animate-fadeIn">
                <span className="faq-a-icon">A</span>
                <span className="faq-a-text">{faq.answer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
