import { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

interface StarRatingProps {
  rating?: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating = 0,
  maxStars = 5,
  size = 20,
  interactive = false,
  onChange,
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (interactive) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div
      className={`flex gap-0.5 ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= displayRating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            disabled={!interactive}
            className={`${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : "cursor-default"
            } disabled:cursor-default`}
          >
            {isFilled ? (
              <FaStar
                size={size}
                className="text-yellow-400 drop-shadow-sm"
              />
            ) : (
              <FaRegStar
                size={size}
                className={interactive ? "text-gray-300 hover:text-yellow-300" : "text-gray-300"}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Componente para mostrar rating con número
export function StarRatingDisplay({
  rating,
  total,
  size = 16,
  showNumber = true,
  className = "",
}: {
  rating: number;
  total?: number;
  size?: number;
  showNumber?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <StarRating rating={Math.round(rating)} size={size} />
      {showNumber && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {rating.toFixed(1)}
          {total !== undefined && (
            <span className="text-gray-400"> ({total} estudiantes)</span>
          )}
        </span>
      )}
    </div>
  );
}
