import { type ReactNode } from 'react';
import './index.css';

interface ModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  children: ReactNode;
}

export function Modal({
  visible,
  title,
  onClose,
  onConfirm,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  children,
}: ModalProps) {
  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal-title">{title}</div>}
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {showCancel && (
            <button className="modal-btn modal-btn-cancel" onClick={onClose}>
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
