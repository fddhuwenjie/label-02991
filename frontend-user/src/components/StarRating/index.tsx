import './index.css';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: number;
  readonly?: boolean;
  label?: string;
}

export function StarRating({ value, onChange, size = 24, readonly = false, label }: StarRatingProps) {
  return (
    <div className="star-rating">
      {label && <span className="star-rating-label">{label}</span>}
      <div className="star-rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= value ? 'star-active' : ''} ${readonly ? 'star-readonly' : ''}`}
            style={{ fontSize: size }}
            onClick={() => !readonly && onChange?.(star)}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}
