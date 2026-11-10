// Primeras secciones de la home desde el pivote a comunidades (10-nov-2026): el club arriba, lo que
// pasa en su muro, qué incluye y la puerta para que otros abran su propia comunidad. Lo de antes
// (cursos, Software Factory, MentorIA, libros) sigue debajo.
//
// ⚠️ Nada con `opacity: 0` inicial: es lo primero que se ve y el HTML del servidor tiene que
// llegar visible aunque la hidratación tarde.
import { Link } from "react-router";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { MicIllustration } from "~/components/community/MicIllustration";
import { clubIncluded } from "~/components/community/clubIncluded";

const CLUB = "/comunidad/club-de-agentes";

export type HomeClub = {
  memberCount: number;
  courseCount: number;
  priceMxn: number;
  nextCall: { title: string; startsAt: string } | null;
  posts: Array<{
    id: string;
    author: { name: string; photoURL: string | null };
    body: string;
    createdAt: string;
    link: { url: string; title: string; image: string | null } | null;
  }>;
};

const callDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });

/** Texto plano de un cuerpo en markdown, para el adelanto. */
const excerpt = (md: string, max = 180) => {
  const t = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_>`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
};

function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  return photoURL ? (
    <img src={photoURL} alt={name} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <span className="grid h-9 w-9 place-content-center rounded-full bg-brand-500 font-bold text-brand-900">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** 1 · El club es lo primero que se ve. */
export function ClubHomeHero({ club }: { club: HomeClub }) {
  return (
    <section className="relative w-full overflow-hidden bg-background px-4 pb-20 pt-32 md:px-10 md:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-500">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Comunidad FixterGeek
          </span>
          <h1 className="mt-6 text-4xl font-bold !leading-tight text-white md:text-5xl xl:text-6xl">
            Construye agentes de IA <span className="text-brand-500">en comunidad</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-colorParagraph lg:mx-0">
            El Club de Agentes de IA junta una llamada en vivo cada semana, todos los cursos de
            FixterGeek y un muro donde los miembros enseñan lo que construyen.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
            <PrimaryButton as="Link" to={CLUB} variant="fill" title="Entra al Club de Agentes" />
            <PrimaryButton as="Link" to="/cursos" title="Ver los cursos" />
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2 text-sm lg:justify-start">
            {[
              `${club.memberCount} miembros`,
              `${club.courseCount} cursos incluidos`,
              `$${club.priceMxn} MXN al mes`,
              "3 meses gratis si ya eres estudiante",
            ].map((t) => (
              <li key={t} className="rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-6">
          <MicIllustration className="h-auto w-[220px] md:w-[280px]" />
          {club.nextCall && (
            <Link
              to={CLUB}
              className="w-full max-w-sm rounded-3xl border border-brand-500/30 bg-backface p-6 transition hover:-translate-y-1 hover:border-brand-500/60"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Próxima llamada</p>
              <p className="mt-2 font-semibold text-white">{club.nextCall.title}</p>
              <p className="mt-1 text-sm text-colorCaption" suppressHydrationWarning>
                {callDate(club.nextCall.startsAt)} (CDMX)
              </p>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** 2 · Lo que se está platicando: las publicaciones públicas del muro. */
export function ClubWallPreview({ posts }: { posts: HomeClub["posts"] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white md:text-4xl">Lo que pasa en el club</h2>
          <p className="mt-2 text-colorParagraph">Publicaciones abiertas del muro de los miembros.</p>
        </div>
        <Link to={CLUB} className="font-semibold text-brand-500 hover:underline">
          Ver el muro completo →
        </Link>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            to={CLUB}
            className="flex flex-col overflow-hidden rounded-3xl border border-colorOutline bg-backface transition hover:-translate-y-1 hover:border-brand-500/50"
          >
            {p.link?.image && (
              <img src={p.link.image} alt="" loading="lazy" className="aspect-[1200/630] w-full object-cover" />
            )}
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3">
                <Avatar {...p.author} />
                <p className="text-sm font-semibold text-white">{p.author.name}</p>
              </div>
              <p className="mt-4 text-colorParagraph">{p.link?.title ?? excerpt(p.body)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** 3 · Qué incluye la membresía. */
export function ClubIncludedSection({ courseCount }: { courseCount: number }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <h2 className="text-3xl font-bold text-white md:text-4xl">Qué incluye el club</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {clubIncluded(courseCount)
          .slice(0, 6)
          .map((c) => (
            <div key={c.title} className="rounded-3xl border border-colorOutline bg-backface p-6">
              <p className="text-3xl">{c.icon}</p>
              <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-colorParagraph">{c.body}</p>
            </div>
          ))}
      </div>
      <div className="mt-10 text-center">
        <PrimaryButton as="Link" to={CLUB} variant="fill" title="Unirme al club" />
      </div>
    </section>
  );
}

/** 4 · Hacia dónde va FixterGeek: otros creadores abren su propia comunidad. */
export function CreatorCommunitiesBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <div className="rounded-3xl border border-brand-500/20 bg-brand-500/5 p-8 md:p-12 lg:p-16">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Próximamente</span>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold !leading-snug text-white md:text-4xl">
          ¿Enseñas algo y tienes gente que te sigue? Abre tu propia comunidad en FixterGeek
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-colorParagraph">
          La misma base del Club de Agentes para tu tema: membresía con cobro mensual, muro, llamadas en
          vivo con su sala propia y grabaciones para tus miembros.
        </p>
        <div className="mt-8">
          <PrimaryButton
            as="a"
            to="mailto:brenda@fixter.org?subject=Quiero%20mi%20comunidad%20en%20FixterGeek"
            title="Quiero mi comunidad"
          />
        </div>
      </div>
    </section>
  );
}
