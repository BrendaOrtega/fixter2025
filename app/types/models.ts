/**
 * Tipos de modelos para usar en componentes cliente.
 * Estos tipos replican los modelos de Prisma sin depender del cliente generado,
 * evitando así problemas de build time cuando Prisma no está disponible.
 */

export type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  photoURL?: string | null;
  role?: string | null;
  roles: string[];
  confirmed: boolean;
  courses: string[];
  tags: string[];
  webinar?: unknown;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  isFree: boolean;
  published?: boolean | null;
  basePrice: number;
  videoIds: string[];
  stripeCoupon?: string | null;
  stripeId?: string | null;
  icon?: string | null;
  poster?: string | null;
  isLive: boolean;
  summary?: string | null;
  authorAt?: string | null;
  authorDescription?: string | null;
  authorName?: string | null;
  authorSocial?: string | null;
  banner?: string | null;
  classTime?: string | null;
  description?: string | null;
  duration?: string | null;
  level?: string | null;
  logos?: string | null;
  meta?: string | null;
  photoUrl?: string | null;
  tipo?: string | null;
  tool?: string | null;
  trailer?: string | null;
  version?: string | null;
  theme?: unknown;
  startDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  videos?: Video[];
};

export type Video = {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
  moduleName?: string | null;
  storageLink?: string | null;
  m3u8?: string | null;
  index?: number | null;
  authorName?: string | null;
  photoUrl?: string | null;
  description?: string | null;
  duration?: string | null;
  poster?: string | null;
  module?: string | null;
  courseIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  coverImage?: string | null;
  body?: string | null;
  authorAt?: string | null;
  photoUrl?: string | null;
  isFeatured?: boolean | null;
  metaImage?: string | null;
  youtubeLink?: string | null;
  authorAtLink?: string | null;
  authorName?: string | null;
  mainTag?: string | null;
  tags: string[];
  category: string[];
  banner?: { img: string; link: string } | null;
  createdAt: Date;
  updatedAt?: Date | null;
};

export type NewsletterStatus = "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";

export type Newsletter = {
  id: string;
  title: string;
  slug?: string | null;
  status: NewsletterStatus;
  subject?: string | null;
  content?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  messageIds: string[];
  delivered: string[];
  opened: string[];
  clicked: string[];
  recipients: string[];
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
