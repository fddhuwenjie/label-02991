import './index.css';

interface LoadingProps {
  text?: string;
  fullscreen?: boolean;
}

export function Loading({ text = '加载中...', fullscreen = false }: LoadingProps) {
  const content = (
    <div className="loading-inner">
      <div className="loading-spinner" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );

  if (fullscreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return <div className="loading-inline">{content}</div>;
}
