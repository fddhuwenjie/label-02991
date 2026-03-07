import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { MOCK_HOT_ADDRESSES } from '../../api/mock/data';
import { generateId } from '../../utils/format';
import type { Address } from '../../types';
import './index.css';

export default function AddressSearchPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'dest';

  const {
    setOrigin,
    setDestination,
    historyAddresses,
    frequentAddresses,
    loadHistoryAddresses,
    loadFrequentAddresses,
    addFrequentAddress,
  } = useOrderStore();

  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'hot' | 'frequent'>('history');

  useEffect(() => {
    loadHistoryAddresses();
    loadFrequentAddresses();
  }, [loadHistoryAddresses, loadFrequentAddresses]);

  const searchResults = useMemo(() => {
    if (!keyword.trim()) return [];
    const kw = keyword.toLowerCase();
    const all = [...MOCK_HOT_ADDRESSES, ...historyAddresses, ...frequentAddresses];
    const unique = new Map<string, Address>();
    all.forEach((a) => {
      if ((a.name.toLowerCase().includes(kw) || a.address.toLowerCase().includes(kw)) && !unique.has(a.address)) {
        unique.set(a.address, a);
      }
    });
    if (unique.size === 0) {
      unique.set(keyword, {
        id: generateId(),
        name: keyword,
        address: `搜索结果: ${keyword}附近`,
        lat: 30.55 + Math.random() * 0.1,
        lng: 104.05 + Math.random() * 0.03,
      });
    }
    return Array.from(unique.values());
  }, [keyword, historyAddresses, frequentAddresses]);

  const selectAddress = (addr: Address) => {
    if (type === 'origin') {
      setOrigin(addr);
    } else {
      setDestination(addr);
    }
    navigate(-1);
  };

  const handleAddFrequent = (addr: Address) => {
    addFrequentAddress(addr);
    toast.success('已添加为常用地址');
  };

  const displayList = activeTab === 'history' ? historyAddresses : activeTab === 'hot' ? MOCK_HOT_ADDRESSES : frequentAddresses;

  return (
    <div className="address-search-page">
      <div className="search-header">
        <button className="search-back" onClick={() => navigate(-1)}>
          <span className="search-back-icon" />
        </button>
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={type === 'origin' ? '搜索出发地' : '搜索目的地'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoFocus
          />
          {keyword && (
            <button className="search-clear" onClick={() => setKeyword('')}>✕</button>
          )}
        </div>
      </div>

      {keyword.trim() ? (
        <div className="search-results animate-fadeIn">
          <div className="search-results-title">搜索结果</div>
          {searchResults.map((addr) => (
            <div key={addr.id + addr.address} className="address-item" onClick={() => selectAddress(addr)}>
              <span className="address-item-icon">📍</span>
              <div className="address-item-info">
                <span className="address-item-name">{addr.name}</span>
                <span className="address-item-addr">{addr.address}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="address-tabs">
            {[
              { key: 'history' as const, label: '历史' },
              { key: 'hot' as const, label: '热门' },
              { key: 'frequent' as const, label: '常用' },
            ].map((t) => (
              <button
                key={t.key}
                className={`address-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="address-list">
            {displayList.length === 0 ? (
              <div className="address-empty">
                {activeTab === 'frequent' ? '暂无常用地址，长按历史地址可添加' : '暂无数据'}
              </div>
            ) : (
              displayList.map((addr) => (
                <div key={addr.id + addr.address} className="address-item" onClick={() => selectAddress(addr)}>
                  <span className="address-item-icon">
                    {activeTab === 'frequent' ? '⭐' : activeTab === 'hot' ? '🔥' : '🕒'}
                  </span>
                  <div className="address-item-info">
                    <span className="address-item-name">{addr.name}</span>
                    <span className="address-item-addr">{addr.address}</span>
                  </div>
                  {activeTab === 'history' && !addr.isFrequent && (
                    <button
                      className="address-item-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFrequent(addr);
                      }}
                    >
                      ＋常用
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
