# GhostyCode Course — Handoff

**Date:** 2026-06-13  
**Status:** Published, pending review

---

## What was built

A 6-lesson free course on GhostyCode: the open-source terminal agent for DeepSeek V4 Pro.

| # | Lesson | Chars | Status |
|---|--------|-------|--------|
| 1 | ¿Qué es GhostyCode? Instalación y configuración | 5,818 | ✅ Written |
| 2 | La Constitución — Los 7 artículos | 8,314 | ✅ Written |
| 3 | Agentes en paralelo | 5,013 | ✅ Written |
| 4 | Manejo de contexto y prefix caching | 4,914 | ✅ Written |
| 5 | Custom instructions y configuración avanzada | 5,240 | ✅ Written |
| 6 | Modelos locales y soberanía digital | 5,469 | ✅ Written |

**URLs:**
- Detail page: https://www.fixtergeek.com/cursos/ghostycode/detalle
- Viewer (lesson 1): https://www.fixtergeek.com/cursos/ghostycode/viewer?videoSlug=ghostycode-que-es-ghostycode-instalacion-y-configuracion
- Course listing: https://www.fixtergeek.com/cursos

---

## Code changes

### Frontend (deployed)

| File | Change |
|------|--------|
| `app/routes/courseDetail.tsx` | Added `dark` class to Streamdown wrapper (fixes code block rendering) |
| `app/routes/courseViewer.tsx` | Added collapsible lesson content below video with scroll-into-view; replaced `react-markdown` with Streamdown+Shiki; added `dark` class |
| `app/components/viewer/UnifiedSidebarMenu.tsx` | Replaced `react-markdown` with Streamdown+Shiki in NotesContent; added `dark` class |

### Data script

| File | Purpose |
|------|---------|
| `scripts/create-ghostycode-course.ts` | Idempotent script: creates 6 Video records with full markdown, creates/updates Course with `tipo: null`, `isFree: true`, `published: true`. Re-run safe (upsert). |

---

## Known issues / pending

1. **UX: Lesson content button visibility.** The "Leer contenido de la lección" button floats at the bottom of the video area. On mobile it's very subtle. May want to make it more prominent or auto-expand on first visit.

2. **UX: When no actual video exists**, the video player shows a poster with play button overlay that does nothing until content is expanded. Consider showing the lesson content by default when `!storageLink && !m3u8 && !youtubeUrl`.

3. **Sidebar "Notas" tab.** Still named "Notas" instead of "Lección" or "Contenido". The lesson content is accessible both below the video (collapsible) and in the sidebar. Redundant but harmless.

4. **Lesson content is in `video.description` field**, not a dedicated `body` field. If a `body` field is added to the Video model later, migrate the content.

5. **No actual videos yet.** All 6 lessons have placeholder video records. When videos are recorded, add `storageLink`/`m3u8`/`youtubeUrl` to the corresponding Video record.

6. **Icon image** is from the GhostyCode+DeepSeek blog post. Consider replacing with a dedicated course cover image.

---

## How to update lessons

Edit `scripts/create-ghostycode-course.ts`, update the markdown strings (`lesson1` through `lesson6`), then run:

```bash
npx tsx scripts/create-ghostycode-course.ts
```

The script uses Prisma `upsert` — safe to re-run, won't duplicate.

---

## To add actual videos

Update each Video record:

```typescript
await prisma.video.update({
  where: { slug: "ghostycode-que-es-ghostycode-instalacion-y-configuracion" },
  data: {
    storageLink: "https://...",
    m3u8: "https://...",  // or youtubeUrl
    duration: "15 min",
  },
});
```

---

## Review checklist

- [ ] Read all 6 lessons for factual accuracy and tone
- [ ] Verify Streamdown rendering (code blocks, TOML syntax, headings)
- [ ] Test on mobile: collapsible lesson content, sidebar
- [ ] Test enrollment flow: email → OTP → access
- [ ] Check course card on `/cursos` listing
- [ ] Consider replacing icon image with dedicated cover
- [ ] Consider renaming sidebar "Notas" tab to "Lección"
