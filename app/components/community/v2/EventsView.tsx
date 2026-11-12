import { CalendarIllustration } from "./CalendarIllustration";
import { RsvpControl, DateTile, EnterCallButton, HostRecControl, describeCall, useNow } from "./call";
import { EmptyNote, SectionHead, Wrap, btn, btnGhost, card } from "./ui";
import type { ClubData } from "./types";

// Eventos: la próxima llamada (el loader sólo entrega esa), con su cuenta regresiva, el .ics
// y la entrada a la sala. Crear y editar eventos sigue en el panel del anfitrión.

export function EventsView({ data }: { data: ClubData }) {
  const { community, event, canMod } = data;
  const now = useNow();
  const call = event ? describeCall(event, now) : null;
  return (
    <>
      <SectionHead
        title="Eventos"
        action={
          canMod && (
            <a href={`/comunidad/${community.slug}/admin`} className={btn}>
              Nuevo evento
            </a>
          )
        }
      />
      <Wrap>
        {event && call ? (
          <div className={`${card} overflow-hidden`}>
            {/* Portada: el flyer del evento si el anfitrión subió uno; si no, la ilustración. */}
            <div className="grid place-items-center border-b border-[#232D33] bg-background">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={`Imagen de «${event.title}»`} className="max-h-[420px] w-full object-contain" />
              ) : (
                <CalendarIllustration className="h-36 w-44 py-2" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3.5">
            <DateTile month={call.month} day={call.dayOfMonth} />
            <div className="min-w-0 flex-1 basis-[12rem]">
              <p className="font-semibold leading-snug text-[#F2F5F4]">
                {event.title}
                {call.isLive && (
                  <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-[#17302C] px-2 py-px align-middle text-[11px] font-semibold text-brand-500">
                    EN VIVO
                  </span>
                )}
              </p>
              <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
                {call.when} · Llamada en vivo
              </p>
              <p className="mt-1 text-xs text-[#D9E0DE]" suppressHydrationWarning>
                {call.status}
              </p>
            </div>
            <div className="flex basis-full flex-wrap items-start justify-end gap-2 md:basis-auto">
              <a href={`/comunidad/${community.slug}/evento/${event.id}.ics`} className={btnGhost}>
                Agregar a mi calendario
              </a>
              <HostRecControl rec={data.rec} show={canMod && event.open} />
              <EnterCallButton event={event} />
            </div>
            </div>
            <div className="border-t border-[#232D33] px-4 py-3">
              <RsvpControl event={event} me={data.me} block />
            </div>
          </div>
        ) : (
          <EmptyNote>Todavía no hay una llamada programada. Cuando se agende, aparece aquí con su cuenta regresiva.</EmptyNote>
        )}
      </Wrap>
    </>
  );
}
