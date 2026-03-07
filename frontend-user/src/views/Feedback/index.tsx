import { useState, useEffect } from 'react';
import { PageHeader } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { submitFeedback, getFeedbackList } from '../../api/feedback';
import { formatShortTime } from '../../utils/format';
import type { FeedbackItem } from '../../types';
import './index.css';

const STATUS_MAP = {
  pending: { label: '待处理', className: 'badge-warning' },
  processing: { label: '处理中', className: 'badge-primary' },
  resolved: { label: '已解决', className: 'badge-success' },
};

export default function FeedbackPage() {
  const toast = useToast();
  const [type, setType] = useState<'suggestion' | 'bug'>('suggestion');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<FeedbackItem[]>([]);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    setList(getFeedbackList());
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('请输入反馈内容');
      return;
    }
    setLoading(true);
    const res = await submitFeedback(type, content, []);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      setContent('');
      setList(getFeedbackList());
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="feedback-page page-with-header">
      <PageHeader title="意见反馈" />

      <div className="feedback-content">
        <div className="fb-tabs">
          <button
            className={`fb-tab ${showForm ? 'active' : ''}`}
            onClick={() => setShowForm(true)}
          >
            提交反馈
          </button>
          <button
            className={`fb-tab ${!showForm ? 'active' : ''}`}
            onClick={() => setShowForm(false)}
          >
            历史反馈 ({list.length})
          </button>
        </div>

        {showForm ? (
          <div className="fb-form animate-fadeIn">
            <div className="fb-type-select">
              <button
                className={`fb-type-btn ${type === 'suggestion' ? 'active' : ''}`}
                onClick={() => setType('suggestion')}
              >
                💡 功能建议
              </button>
              <button
                className={`fb-type-btn ${type === 'bug' ? 'active' : ''}`}
                onClick={() => setType('bug')}
              >
                🐛 Bug反馈
              </button>
            </div>

            <textarea
              className="textarea-field"
              placeholder="请详细描述您的建议或遇到的问题..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
            />
            <div className="fb-counter">{content.length}/500</div>

            <div className="fb-upload" onClick={() => toast.info('图片上传功能暂未开放')}>
              <span className="fb-upload-icon">📷</span>
              <span>上传图片（可选）</span>
            </div>

            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
            >
              {loading ? '提交中...' : '提交反馈'}
            </button>
          </div>
        ) : (
          <div className="fb-history animate-fadeIn">
            {list.length === 0 ? (
              <div className="fb-empty">暂无反馈记录</div>
            ) : (
              list.map((item) => {
                const statusInfo = STATUS_MAP[item.status];
                return (
                  <div key={item.id} className="fb-item card">
                    <div className="fbi-header">
                      <span className="fbi-type">
                        {item.type === 'suggestion' ? '💡 功能建议' : '🐛 Bug反馈'}
                      </span>
                      <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                    </div>
                    <p className="fbi-content">{item.content}</p>
                    <span className="fbi-time">{formatShortTime(item.createdAt)}</span>
                    {item.reply && (
                      <div className="fbi-reply">
                        <span className="fbi-reply-label">官方回复：</span>
                        {item.reply}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
