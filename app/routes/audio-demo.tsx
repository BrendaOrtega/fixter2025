import type { MetaFunction } from "react-router";
import AudioPlayer from "~/components/AudioPlayer";

export const meta: MetaFunction = () => {
  return [
    { title: "Audio Player Demo" },
    { name: "description", content: "Demo page for the AudioPlayer component" },
  ];
};

export default function AudioDemo() {
  const mockPost = {
    id: "demo-post-1",
    title: "Hackea tu futuro con Fixtergeek",
    body: `
      ¿Cansado de tutoriales básicos que no te llevan a ningún lado? En Fixtergeek.com rompemos las reglas del aprendizaje tradicional. Aquí no memorizas sintaxis, aquí aprendes a pensar como un hacker.

      Dominamos JavaScript, React, Node.js, Python, y las últimas tecnologías de inteligencia artificial. Pero no solo eso: te enseñamos a quebrar problemas complejos, a optimizar como un ninja, y a construir productos que realmente importen.

      Nuestros instructores no son profesores de academia. Son desarrolladores que han estado en las trincheras, que han construido startups, que han escalado sistemas a millones de usuarios.

      Miles de developers ya han hackeado su carrera con nosotros. Es tu turno de unirte a la revolución del código. Fixtergeek: donde los developers reales aprenden las skills que realmente importan.
    `,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">
            Demo del AudioPlayer
          </h1>

          <div className="grid gap-8">
            {/* Default AudioPlayer */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                AudioPlayer por defecto
              </h2>
              <AudioPlayer
                postId={mockPost.id}
                postTitle={mockPost.title}
                postBody={mockPost.body}
              />
            </div>

            {/* AudioPlayer with different content */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                Ejemplo con contenido técnico
              </h2>
              <AudioPlayer
                postId="demo-post-2"
                postTitle="JavaScript: El lenguaje que domina la web"
                postBody="JavaScript no es solo un lenguaje, es el arma secreta de todo hacker web. En Fixtergeek desbloqueamos sus secretos más profundos: desde closures y prototypes hasta async programming y metaprogramming. Aprende a manipular el DOM como un ninja, a optimizar performance como un pro, y a integrar AI APIs que harán que tus apps sean imparables."
              />
            </div>

            {/* AudioPlayer with custom styling */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                Ejemplo sobre React + AI
              </h2>
              <AudioPlayer
                postId="demo-post-3"
                postTitle="React + AI: Construye el futuro"
                postBody="React ya no es solo interfaces bonitas. Es la base para construir aplicaciones inteligentes que integran machine learning, procesamiento de lenguaje natural, y computer vision. En Fixtergeek te enseñamos a combinar React con las APIs más poderosas de AI, a crear chatbots inteligentes, y a construir experiencias que parecen magia pero son puro código."
                className="border-2 border-brand-500 shadow-2xl"
              />
            </div>

            {/* Post content for context */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                Contenido del post de ejemplo
              </h2>
              <div className="bg-backface border border-colorOutline rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  {mockPost.title}
                </h3>
                <div className="text-colorParagraph space-y-4">
                  {mockPost.body.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
