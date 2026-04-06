import LiquidEther from "~/components/backgrounds/LiquidEther";
import { BsLinkedin, BsGithub, BsFacebook } from "react-icons/bs";

export const AuthorSignature = () => {
  return (
    <section className="py-10 lg:py-20 relative overflow-hidden bg-zinc-950 rounded-3xl my-12">
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#85DDCB", "#37AB93", "#186656"]}
          mouseForce={50}
          cursorSize={150}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.5}
          takeoverDuration={0.1}
          autoResumeDelay={2000}
          autoRampDuration={0.3}
        />
      </div>
      <div className="relative container mx-auto px-4 z-10 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden bg-zinc-900/90 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="font-light text-zinc-400">Escrito por</span>
                <h3 className="text-3xl font-bold mt-2 mb-4 text-emerald-400">
                  Héctor Bliss
                </h3>
                <p className="mb-6 text-zinc-400/90">
                  Pionero en hacer la tecnología accesible para todos, con más de
                  10 años enseñando desarrollo de software y una comunidad de más
                  de 2,000 estudiantes activos.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      10+
                    </div>
                    <div className="text-xs text-zinc-400/90">
                      Años enseñando
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      2K+
                    </div>
                    <div className="text-xs text-zinc-400/90">Estudiantes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      100%
                    </div>
                    <div className="text-xs text-zinc-400/90">Práctico</div>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <a
                    href="https://www.linkedin.com/in/hectorbliss/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    <BsLinkedin className="text-2xl" />
                  </a>
                  <a
                    href="https://github.com/blissito"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    <BsGithub className="text-2xl" />
                  </a>
                  <a
                    href="https://www.facebook.com/blissito"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    <BsFacebook className="text-2xl" />
                  </a>
                </div>
              </div>
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-20"
                  style={{ backgroundColor: "#85DDCB" }}
                />
                <img
                  className="w-full rounded-2xl relative z-10"
                  src="/courses/titor.png"
                  alt="Héctor Bliss"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
