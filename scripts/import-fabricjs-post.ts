import { db } from "../app/.server/db";

const postContent = `En mi canal ya tengo [un video](https://youtu.be/AbU5AYIOeU0?si=2VS5kc_vYcC2o0b5) en el que te muestro cómo usar Fabric.js. 📺

[Fabric.js](https://fabricjs.com/) es una *library* *open source* que le agrega controles y opciones muy útiles al *canvas* de HTML5.

En este componente utilizo Fabric.js para crear un selector de imagen de perfil, así recorto la imagen desde el cliente y mando la versión más pequeña posible directo a mi *bucket* S3, para luego actualizar el modelo de mi usuario. 🤓

Mi código está simplificado con fines educativos, no se recomienda su uso en producción.

\`\`\`jsx
const CanvasModal = forwardRef<HTMLCanvasElement>(
  ({ onClose, visible }: { visible?: boolean; onClose?: () => void }, ref) => {
    return (
      <div
        className={cn(
          "fixed inset-0 hidden place-content-center bg-gray-500/70 backdrop-blur-sm z-10",
          {
            grid: visible,
          }
        )}
      >
        <canvas ref={ref} className="" />
        <button
          onClick={onClose}
          className="py-2 px-4 bg-brand-700 text-white rounded-xl mt-12"
        >
          Aceptar
        </button>
      </div>
    );
  }
);
\`\`\`

Ese es el componente que renderiza el canvas.

\`\`\`jsx
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.currentTarget.files?.length || !canvasRef.current) return; //@todo files
    setIsEditing(true);

    const imageURL = URL.createObjectURL(event.currentTarget.files[0]);
    const img = await fabric.FabricImage.fromURL(imageURL);
    img.selectable = true;
    img.scaleToHeight(320);
    canvasObj.current?.dispose();
    canvasObj.current = new fabric.Canvas(canvasRef.current, {
      width: innerWidth,
      height: innerHeight - 220,
      backgroundColor: "black",
    });
    const center = canvasObj.current.getCenterPoint();
    img.left = center.x - 160;
    img.top = center.y - 160;
    canvasObj.current.add(img);
    const clipPath = new fabric.Circle({
      radius: 160,
      top: center.y - 160,
      left: center.x - 160,
      borderColor: "red",
    });
    canvasObj.current.clipPath = clipPath;
    canvasObj.current.setActiveObject(canvasObj.current.item(0));
  };
\`\`\`

Esta es la función que usa \`fabric.Canvas\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro canal de YouTube. [Suscríbete aquí](https://www.youtube.com/@fixtergeek) para no perderte ninguno.

---

\`\`\`jsx
  const onClose = async () => {
    setIsEditing(false);
    const center = canvasObj.current?.getCenterPoint();
    canvasObj.current?.setDimensions({
      width: 160,
      height: 160,
    });
    const resultImage = canvasObj.current?.toDataURL({
      // top: center.y,
      top: center.y - 160,
      left: center.x - 160,
      width: 320,
      height: 320,
      multiplier: 1,
      format: "png",
      // quality: 0.2,
    });
    const file = await fetch(resultImage).then((r) => r.blob());
    setImageSrc(resultImage);
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = true;
    a.click();
    if (!file) return;
    await fetch(putURL, {
      method: "PUT",
      body: file,
      headers: {
        "content-type": file.type,
        "content-length": file.size,
      },
    }).catch((e) => console.error(e));
  };
\`\`\`

\`onClose\` es la función que realmente genera la imagen. 🌉

Ahí está. Te dejo de todas formas el [link](https://github.com/BrendaOrtega/fixter2025) al código.

Abrazo. bliss.`;

async function main() {
  console.log("Importando post de Fabric.js...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "como-crear-un-recortador-de-imagen-de-perfil-con-fabricjs" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "como-crear-un-recortador-de-imagen-de-perfil-con-fabricjs",
      title: "Cómo crear un recortador de imagen de perfil con Fabric.js",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/W0LAuMg.jpg",
      metaImage: "https://i.imgur.com/W0LAuMg.jpg",

      // Video
      youtubeLink: "https://youtu.be/ArzLI6Cb4jg",

      // Clasificación
      tags: ["fabricjs", "canvas", "react", "s3", "images"],
      mainTag: "fabricjs",

      // Fecha original del post (29 Diciembre 2024, basado en createdAt del HTML)
      createdAt: new Date(1735502348061),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
