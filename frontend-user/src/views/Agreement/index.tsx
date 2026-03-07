import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/Layout';
import { getAgreementByType } from '../../api/agreement';
import type { Agreement } from '../../types';
import './index.css';

export default function AgreementPage() {
  const { type } = useParams<{ type: string }>();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadAgreement() {
      setLoading(true);
      const data = await getAgreementByType(type || '');
      if (!mounted) return;
      setAgreement(data);
      setLoading(false);
    }
    loadAgreement();
    return () => {
      mounted = false;
    };
  }, [type]);

  if (loading) {
    return (
      <div className="agreement-page page-with-header">
        <PageHeader title="协议详情" />
        <div className="agreement-not-found">
          <p>协议加载中...</p>
        </div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="agreement-page page-with-header">
        <PageHeader title="协议详情" />
        <div className="agreement-not-found">
          <p>协议内容未找到</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agreement-page page-with-header">
      <PageHeader title={agreement.title} />
      <div className="agreement-content">
        <div className="agreement-meta">
          <span>更新日期：{agreement.updatedAt}</span>
        </div>
        <div className="agreement-text">
          {agreement.content.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
