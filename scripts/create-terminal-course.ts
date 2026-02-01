import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const courseDescription = `## ¿Por qué este curso?

La terminal no es solo una reliquia del pasado—es la **interfaz más poderosa** que tienes como desarrollador. Y en 2026, con herramientas como Claude Code, dominar la terminal es más importante que nunca.

> "No te voy a enseñar 100 comandos que olvidarás en una semana. Te voy a enseñar los **20 comandos y 10 herramientas** que usarás todos los días."

---

## 🎯 Para quién es este curso

**Es para ti si:**
- Quieres sentirte cómodo usando la terminal
- Usas (o quieres usar) Claude Code
- Buscas ser más productivo como desarrollador
- Te frustran los comandos crípticos de grep y find

**No es para ti si:**
- Ya dominas tmux, fzf, ripgrep y zsh
- Buscas administración de servidores Linux avanzada

---

## 🛠️ Herramientas Modernas (100% Open Source)

| Categoría | Herramienta | Reemplaza |
|-----------|-------------|-----------|
| 🔍 Búsqueda | \`fzf\` | Ctrl+R básico |
| 🔍 En archivos | \`ripgrep (rg)\` | grep lento |
| 📁 Buscar archivos | \`fd\` | find confuso |
| 📂 Listar | \`eza\` | ls sin colores |
| 📄 Ver archivos | \`bat\` | cat sin syntax |
| 📖 Ayuda | \`tldr\` | man pages eternas |
| 🌿 Git visual | \`lazygit\` | git CLI puro |
| 🎨 Prompt | \`Starship\` | prompt aburrido |
| 🖥️ Multiplexor | \`tmux\` | una sola terminal |

---

## 📚 Lo que vas a aprender

### Módulo 1: Fundamentos y Setup
- Shell moderno: Zsh vs Bash
- Prompt profesional con Starship
- Dotfiles que hacen sentido

### Módulo 2: Navegación Moderna
- Encontrar archivos en milisegundos con \`fd\` y \`fzf\`
- Buscar código como un pro con \`ripgrep\`
- Visualizar archivos con syntax highlighting

### Módulo 3: Git desde Terminal
- Workflow completo sin salir de la terminal
- \`lazygit\` para staging visual
- GitHub CLI (\`gh\`) para PRs e issues

### Módulo 4: Productividad Avanzada
- Sesiones persistentes con tmux
- Aliases y funciones útiles
- Procesamiento de JSON con \`jq\`

### Módulo 5: Scripting Básico
- Automatiza tareas repetitivas
- Bash scripting sin dolor
- Cron para tareas programadas

### Módulo 6: Terminal + IA
- Prepara tu entorno para Claude Code
- Entiende qué herramientas usa Claude internamente
- Debugging de scripts generados por IA

---

## 🚀 Prepárate para la IA

Este curso te prepara específicamente para trabajar con **Claude Code** y herramientas similares. Aprenderás las mismas herramientas que Claude usa internamente (ripgrep, fd, git) y entenderás cómo maximizar tu productividad combinando terminal + IA.`;

async function main() {
  console.log("🎯 Creando curso: Terminal para la Era de IA\n");

  // 1. Crear o actualizar el curso
  const course = await prisma.course.upsert({
    where: { slug: "terminal-ia" },
    update: {
      title: "Terminal para la Era de IA",
      tipo: "proximamente",
      published: true,
      isFree: true,
      basePrice: 0,
      level: "Principiante",
      duration: "11 horas",
      authorName: "Héctor Bliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      icon: "https://images.pexels.com/photos/5380664/pexels-photo-5380664.jpeg?auto=compress&cs=tinysrgb&w=800",
      summary:
        "Domina las herramientas modernas de terminal y prepárate para Claude Code. Aprende fzf, ripgrep, lazygit, tmux y más.",
      description: courseDescription,
      videoIds: [],
    },
    create: {
      slug: "terminal-ia",
      title: "Terminal para la Era de IA",
      tipo: "proximamente",
      published: true,
      isFree: true,
      basePrice: 0,
      level: "Principiante",
      duration: "11 horas",
      authorName: "Héctor Bliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      icon: "https://images.pexels.com/photos/5380664/pexels-photo-5380664.jpeg?auto=compress&cs=tinysrgb&w=800",
      summary:
        "Domina las herramientas modernas de terminal y prepárate para Claude Code. Aprende fzf, ripgrep, lazygit, tmux y más.",
      description: courseDescription,
      videoIds: [],
    },
  });

  console.log(`✅ Curso creado/actualizado: ${course.id}`);
  console.log(`   Slug: ${course.slug}`);
  console.log(`   Tipo: ${course.tipo}`);
  console.log(`   URL: https://www.fixtergeek.com/cursos/${course.slug}/detalle`);

  // 2. Crear o actualizar el LeadMagnet para waitlist
  const leadMagnet = await prisma.leadMagnet.upsert({
    where: { slug: "espera-terminal-ia" },
    update: {
      type: "waitlist",
      title: "Terminal para la Era de IA - Lista de Espera",
      tagOnDownload: "espera-terminal-ia",
      isActive: true,
      heroTitle: "Únete a la lista de espera",
      heroSubtitle:
        "Te avisaremos cuando el curso esté disponible. Sin spam, solo el aviso.",
      ctaText: "Quiero que me avisen",
      inputPlaceholder: "tu@email.com",
      successTitle: "¡Estás en la lista!",
      successMessage: "Te avisaremos cuando lancemos el curso.",
      primaryColor: "#10b981", // Verde terminal/emerald
      bgPattern: "dots",
      showFooter: true,
    },
    create: {
      slug: "espera-terminal-ia",
      type: "waitlist",
      title: "Terminal para la Era de IA - Lista de Espera",
      tagOnDownload: "espera-terminal-ia",
      isActive: true,
      heroTitle: "Únete a la lista de espera",
      heroSubtitle:
        "Te avisaremos cuando el curso esté disponible. Sin spam, solo el aviso.",
      ctaText: "Quiero que me avisen",
      inputPlaceholder: "tu@email.com",
      successTitle: "¡Estás en la lista!",
      successMessage: "Te avisaremos cuando lancemos el curso.",
      primaryColor: "#10b981",
      bgPattern: "dots",
      showFooter: true,
    },
  });

  console.log(`\n✅ LeadMagnet (waitlist) creado/actualizado: ${leadMagnet.id}`);
  console.log(`   Slug: ${leadMagnet.slug}`);
  console.log(`   Tag: ${leadMagnet.tagOnDownload}`);

  // 3. Mostrar resumen
  const totalCourses = await prisma.course.count();
  const totalLeadMagnets = await prisma.leadMagnet.count();
  const waitlistCount = await prisma.subscriber.count({
    where: { tags: { has: "espera-terminal-ia" } },
  });

  console.log(`\n📊 Resumen:`);
  console.log(`   Total cursos: ${totalCourses}`);
  console.log(`   Total lead magnets: ${totalLeadMagnets}`);
  console.log(`   Interesados en Terminal IA: ${waitlistCount}`);

  console.log(`\n🎉 ¡Listo! El curso aparecerá en /cursos con badge "PRÓXIMAMENTE"`);
  console.log(`   La página de detalle mostrará el formulario de lista de espera.`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  prisma.$disconnect();
  process.exit(1);
});
