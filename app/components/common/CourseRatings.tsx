import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { StarRating, StarRatingDisplay } from "./StarRating";
import { FaStar } from "react-icons/fa";
import { cn } from "~/utils/cn";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  title: string | null;
  avatarUrl: string | null;
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

// Avatares de personas reales de randomuser.me
const AVATAR_URLS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
  "https://randomuser.me/api/portraits/men/43.jpg",
  "https://randomuser.me/api/portraits/women/26.jpg",
  "https://randomuser.me/api/portraits/men/86.jpg",
  "https://randomuser.me/api/portraits/women/63.jpg",
  "https://randomuser.me/api/portraits/men/29.jpg",
];

// Avatar aleatorio que cambia en cada render (sin consistencia)
function getRandomAvatarUrl(): string {
  const randomIndex = Math.floor(Math.random() * AVATAR_URLS.length);
  return AVATAR_URLS[randomIndex];
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
      <section className="py-20 md:py-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto">
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

  const ratingsWithComments = data.ratings.filter(r => r.comment);
  const ratingsCount = ratingsWithComments.length;

  return (
    <section className={`py-20 md:py-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-brand-500 font-medium mb-3 tracking-wide uppercase text-sm"
        >
          Testimonios
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-bold text-white mb-8"
        >
          {title}
        </motion.h3>
        {/* Promedio destacado */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3"
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={cn(
                  "w-5 h-5",
                  star <= Math.round(data.average) ? "text-yellow-400" : "text-gray-600"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-base">
            <span className="text-white font-bold">{data.average}</span>
            <span className="text-gray-500">/5</span>
            <span className="text-gray-600 mx-1">•</span>
            <span className="text-gray-400">{data.total} {data.total === 1 ? 'opinión' : 'opiniones'}</span>
          </div>
        </motion.div>
      </div>

      {/* Grid de testimonios - centrado cuando hay pocos */}
      {ratingsCount > 0 && (
        <div className={cn(
          "grid gap-8 justify-center",
          ratingsCount === 1 && "max-w-lg mx-auto",
          ratingsCount === 2 && "md:grid-cols-2 max-w-4xl mx-auto",
          ratingsCount >= 3 && "md:grid-cols-2 lg:grid-cols-3"
        )}>
          {ratingsWithComments.map((rating, index) => (
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

  // Usa el avatar del usuario si existe, sino fallback aleatorio
  const avatarUrl = rating.avatarUrl || getRandomAvatarUrl();

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="group"
    >
      <div className="relative h-full bg-gradient-to-b from-white/[0.08] to-transparent border border-white/[0.08] rounded-2xl p-8 transition-all duration-300 hover:border-brand-500/30 hover:from-white/[0.12]">
        {/* Stars */}
        <div className="flex items-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={cn(
                "w-4 h-4",
                star <= rating.rating ? "text-yellow-400" : "text-gray-700"
              )}
            />
          ))}
        </div>

        {/* Comment */}
        <blockquote className="text-gray-300 leading-relaxed mb-8 text-[15px]">
          "{rating.comment}"
        </blockquote>

        {/* Author */}
        <div className="flex items-center gap-4">
          <img
            src={avatarUrl}
            alt={rating.displayName || "Estudiante"}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
          />
          <div>
            <p className="text-white font-medium">
              {rating.displayName || "Estudiante verificado"}
            </p>
            <p className="text-gray-500 text-sm">{rating.title || "Estudiante"}</p>
          </div>
        </div>
      </div>
    </motion.article>
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
    <section className={`py-20 md:py-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-brand-500 font-medium mb-3 tracking-wide uppercase text-sm"
        >
          Testimonios
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-bold text-white"
        >
          {title}
        </motion.h3>
      </div>

      <div className={cn(
        "grid gap-8 justify-center",
        testimonials.length === 1 && "max-w-lg mx-auto",
        testimonials.length === 2 && "md:grid-cols-2 max-w-4xl mx-auto",
        testimonials.length >= 3 && "md:grid-cols-2 lg:grid-cols-3"
      )}>
        {testimonials.map((testimonial, index) => {
          const avatarUrl = testimonial.image || AVATAR_URLS[index % AVATAR_URLS.length];

          return (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
              className="group"
            >
              <div className="relative h-full bg-gradient-to-b from-white/[0.08] to-transparent border border-white/[0.08] rounded-2xl p-8 transition-all duration-300 hover:border-brand-500/30 hover:from-white/[0.12]">
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar key={star} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>

                {/* Comment */}
                <blockquote className="text-gray-300 leading-relaxed mb-8 text-[15px]">
                  "{testimonial.comment}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl}
                    alt={testimonial.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
                  />
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.article>
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
