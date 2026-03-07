import './index.css';

interface EmptyProps {
  icon?: string;
  text?: string;
  actionText?: string;
  onAction?: () => void;
}

export function Empty({ icon = '📭', text = '暂无数据', actionText, onAction }: EmptyProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <p className="empty-text">{text}</p>
      {actionText && onAction && (
        <button className="btn btn-outline btn-sm" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
