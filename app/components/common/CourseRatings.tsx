import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { StarRating, StarRatingDisplay } from "./StarRating";
import { FaQuoteLeft, FaStar } from "react-icons/fa";

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
  title?: string;
  fallbackTestimonials?: Array<{
    name: string;
    role: string;
    comment: string;
    image?: string;
  }>;
}

export function CourseRatings({
  courseSlug,
  limit = 6,
  showFeaturedOnly = false,
  className = "",
  title = "Lo que dicen nuestros estudiantes",
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
        title={title}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <section className="mt-20 md:mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-gray-700 rounded mb-8 mx-auto" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-700/30 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data || data.total === 0) {
    return null;
  }

  return (
    <section className={`mt-20 md:mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {title}
        </h3>
        {/* Promedio destacado */}
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(data.average)
                    ? "text-yellow-400"
                    : "text-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-white font-semibold text-lg">{data.average}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">{data.total} opiniones</span>
        </div>
      </div>

      {/* Grid de testimonios */}
      {data.ratings.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

  // Generar iniciales para avatar
  const initials = (rating.displayName || "E")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Color aleatorio pero consistente basado en el nombre
  const colors = ["bg-brand-500", "bg-brand_blue", "bg-purple-500", "bg-pink-500", "bg-orange-500"];
  const colorIndex = (rating.displayName || "").length % colors.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-gradient-to-br from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-brand-500/30 hover:from-white/[0.09] hover:to-white/[0.05] transition-all duration-300"
    >
      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`w-4 h-4 ${
              star <= rating.rating ? "text-yellow-400" : "text-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Comment */}
      <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-4">
        "{rating.comment}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <div className={`w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-semibold text-sm`}>
          {initials}
        </div>
        <div>
          <p className="text-white font-medium text-sm">
            {rating.displayName || "Estudiante verificado"}
          </p>
          <p className="text-gray-500 text-xs">Estudiante del curso</p>
        </div>
      </div>
    </motion.div>
  );
}

// Fallback para cuando no hay ratings reales
function FallbackTestimonials({
  testimonials,
  title,
  className,
}: {
  testimonials: Array<{
    name: string;
    role: string;
    comment: string;
    image?: string;
  }>;
  title: string;
  className?: string;
}) {
  return (
    <section className={`mt-20 md:mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h3 className="text-3xl md:text-4xl font-bold text-white">
          {title}
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => {
          const initials = testimonial.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const colors = ["bg-brand-500", "bg-brand_blue", "bg-purple-500", "bg-pink-500", "bg-orange-500"];
          const colorIndex = testimonial.name.length % colors.length;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="bg-gradient-to-br from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-brand-500/30 hover:from-white/[0.09] hover:to-white/[0.05] transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar key={star} className="w-4 h-4 text-yellow-400" />
                ))}
              </div>

              {/* Comment */}
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                "{testimonial.comment}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                {testimonial.image ? (
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-semibold text-sm`}>
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-gray-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
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
