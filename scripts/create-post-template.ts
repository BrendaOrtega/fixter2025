import { db } from "../app/.server/db";

const sshPostContent = `
¿Te ha pasado que cada vez que haces \`git push\` tienes que escribir tu usuario y contraseña? Eso ya no debería pasar. Desde 2021, GitHub deprecó el uso de passwords para operaciones Git, y la forma oficial de autenticarte es con **SSH keys**.

En esta guía te muestro cómo configurar SSH keys en tu máquina para que nunca más tengas que escribir credenciales.

## ¿Por qué SSH keys?

- **Seguridad**: Las llaves SSH son más seguras que las contraseñas
- **Comodidad**: Una vez configuradas, no vuelves a escribir credenciales
- **Estándar**: Es el método recomendado por GitHub, GitLab y Bitbucket

## Paso 1: Verificar si ya tienes SSH keys

Abre tu terminal y ejecuta:

\`\`\`bash
ls -la ~/.ssh
\`\`\`

Si ves archivos como \`id_rsa\` y \`id_rsa.pub\` (o \`id_ed25519\` y \`id_ed25519.pub\`), ya tienes llaves. Puedes saltar al paso 4.

## Paso 2: Generar una nueva SSH key

Ejecuta este comando (reemplaza el email con el tuyo):

\`\`\`bash
ssh-keygen -t ed25519 -C "tu@email.com"
\`\`\`

Cuando te pregunte dónde guardar la llave, presiona Enter para usar la ubicación por defecto.

Te pedirá un **passphrase** (contraseña). Puedes dejarla vacía presionando Enter, pero se recomienda agregar una para mayor seguridad.

## Paso 3: Agregar la llave al ssh-agent

El ssh-agent mantiene tus llaves cargadas en memoria:

\`\`\`bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
\`\`\`

## Paso 4: Copiar la llave pública

Copia el contenido de tu llave pública al portapapeles:

**En macOS:**
\`\`\`bash
pbcopy < ~/.ssh/id_ed25519.pub
\`\`\`

**En Linux:**
\`\`\`bash
cat ~/.ssh/id_ed25519.pub
\`\`\`
(Y copia el output manualmente)

**En Windows (Git Bash):**
\`\`\`bash
clip < ~/.ssh/id_ed25519.pub
\`\`\`

## Paso 5: Agregar la llave a GitHub

1. Ve a [GitHub Settings → SSH Keys](https://github.com/settings/keys)
2. Click en **"New SSH key"**
3. Ponle un título descriptivo (ej: "MacBook Pro Personal")
4. Pega la llave pública que copiaste
5. Click en **"Add SSH key"**

## Paso 6: Probar la conexión

Verifica que todo funcione:

\`\`\`bash
ssh -T git@github.com
\`\`\`

Deberías ver un mensaje como:

\`\`\`
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
\`\`\`

## Paso 7: Cambiar tus repos a SSH

Si ya tenías repos clonados con HTTPS, cámbialos a SSH:

\`\`\`bash
# Ver el remote actual
git remote -v

# Cambiar de HTTPS a SSH
git remote set-url origin git@github.com:usuario/repo.git
\`\`\`

## Solución de problemas

### "Permission denied (publickey)"

Verifica que:
1. La llave esté agregada al ssh-agent: \`ssh-add -l\`
2. La llave pública esté en GitHub
3. Estés usando el remote SSH, no HTTPS

### "Could not open a connection to your authentication agent"

Inicia el ssh-agent:
\`\`\`bash
eval "$(ssh-agent -s)"
\`\`\`

### Múltiples cuentas de GitHub

Si tienes cuenta personal y de trabajo, necesitas configurar un archivo \`~/.ssh/config\`:

\`\`\`
# Cuenta personal
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal

# Cuenta trabajo
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
\`\`\`

---

Con esto ya tienes SSH configurado. Ahora cada \`git push\` y \`git pull\` funcionará sin pedirte credenciales.

Abrazo. bliss.
`;

async function main() {
  console.log("Creando post de SSH keys...");

  const post = await db.post.create({
    data: {
      slug: "como-configurar-ssh-keys-github",
      title: "Cómo Configurar SSH Keys para GitHub en 5 Minutos",
      body: sshPostContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["git", "github", "ssh", "terminal", "productividad"],
      mainTag: "git",
    },
  });

  console.log("✅ Post creado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
