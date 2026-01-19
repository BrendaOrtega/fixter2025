import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { StarRating, StarRatingDisplay } from "./StarRating";
import { FaQuoteLeft } from "react-icons/fa";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  createdAt: string;
  featured: boolean;
}

interface RatingsData {
  ratings: Rating[];
  average: number;
  total: number;
}

interface CourseRatingsProps {
  courseSlug: string;
  limit?: number;
  showFeaturedOnly?: boolean;
  className?: string;
  fallbackTestimonials?: Array<{
    name: string;
    role: string;
    comment: string;
    image?: string;
  }>;
}

export function CourseRatings({
  courseSlug,
  limit = 3,
  showFeaturedOnly = false,
  className = "",
  fallbackTestimonials,
}: CourseRatingsProps) {
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      courseSlug,
      limit: String(limit),
      ...(showFeaturedOnly && { featured: "true" }),
    });

    fetch(`/api/ratings?${params}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.ratings) {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [courseSlug, showFeaturedOnly, limit]);

  // Si no hay ratings aprobados, mostrar fallback
  if (!loading && (!data || data.total === 0) && fallbackTestimonials) {
    return (
      <FallbackTestimonials
        testimonials={fallbackTestimonials}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 w-48 bg-gray-700 rounded mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-700/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return null;
  }

  return (
    <section className={className}>
      {/* Header con promedio */}
      <div className="flex items-center gap-4 mb-6">
        <StarRatingDisplay
          rating={data.average}
          total={data.total}
          size={24}
        />
      </div>

      {/* Grid de testimonios */}
      {data.ratings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.ratings.map((rating, index) => (
            <TestimonialCard
              key={rating.id}
              rating={rating}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TestimonialCard({
  rating,
  index,
}: {
  rating: Rating;
  index: number;
}) {
  if (!rating.comment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
    >
      <FaQuoteLeft className="text-brand_blue/50 text-xl mb-3" />
      <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4">
        {rating.comment}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium text-sm">
            {rating.displayName || "Estudiante"}
          </p>
          <StarRating rating={rating.rating} size={12} />
        </div>
      </div>
    </motion.div>
  );
}

// Fallback para cuando no hay ratings reales
function FallbackTestimonials({
  testimonials,
  className,
}: {
  testimonials: Array<{
    name: string;
    role: string;
    comment: string;
    image?: string;
  }>;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
          >
            <FaQuoteLeft className="text-brand_blue/50 text-xl mb-3" />
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {testimonial.comment}
            </p>
            <div className="flex items-center gap-3">
              {testimonial.image && (
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-white font-medium text-sm">
                  {testimonial.name}
                </p>
                <p className="text-gray-500 text-xs">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Componente compacto para mostrar solo el promedio
export function CourseRatingSummary({
  courseSlug,
  className = "",
}: {
  courseSlug: string;
  className?: string;
}) {
  const [data, setData] = useState<{ average: number; total: number } | null>(
    null
  );

  useEffect(() => {
    fetch(`/api/ratings?courseSlug=${courseSlug}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.average !== undefined) {
          setData({ average: result.average, total: result.total });
        }
      })
      .catch(() => {});
  }, [courseSlug]);

  if (!data || data.total === 0) return null;

  return (
    <StarRatingDisplay
      rating={data.average}
      total={data.total}
      className={className}
    />
  );
}
