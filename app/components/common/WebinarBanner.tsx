import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFetcher, useNavigate } from "react-router";

export const WebinarBanner = () => {
  const [showStickyBanner, setShowStickyBanner] = useState(false);
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Mostrar banner sticky después de hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowStickyBanner(true);
      } else {
        setShowStickyBanner(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle escape key to close form and block scroll
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowWebinarForm(false);
      }
    };

    if (showWebinarForm) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [showWebinarForm]);

  // Webinar Form Component
  const WebinarForm = () => {
    const isSuccess = fetcher.data?.success && fetcher.data?.type === "webinar";
    const error = fetcher.data?.error;
    const isLoading = fetcher.state !== "idle";
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={() => setShowWebinarForm(false)}
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          exit={{ y: 50 }}
          className={`bg-background rounded-2xl p-8 max-w-md w-full border text-center ${
            isSuccess 
              ? 'border-brand-500/30' 
              : 'border-brand-500/30'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isSuccess ? '¡Registro Exitoso!' : 'Regístrate al Webinar'}
            </h3>
            <button
              onClick={() => setShowWebinarForm(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {isSuccess ? (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-300 mb-6">
                Te has registrado exitosamente al webinar. Te enviaremos los detalles por email.
              </p>
              <button
                onClick={() => setShowWebinarForm(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <fetcher.Form method="post" action="/claude" className="space-y-3">
              <input type="hidden" name="intent" value="webinar_registration" />
              
              <div>
                <label className="block text-white mb-1 text-left">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="Tu nombre completo"
                />
              </div>
              
              <div>
                <label className="block text-white mb-1 text-left">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="tu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-white mb-1 text-left">Teléfono (opcional)</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="+52 1 234 567 8900"
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-white mb-1 text-xs text-left">Nivel</label>
                  <select
                    name="experienceLevel"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                  >
                    <option value="">Selecciona...</option>
                    <option value="junior">Junior (0-2 años)</option>
                    <option value="mid">Mid-level (2-5 años)</option>
                    <option value="senior">Senior (5+ años)</option>
                    <option value="lead">Lead/Manager</option>
                    <option value="student">Estudiante</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white mb-1 text-xs text-left">Ocupación</label>
                  <select
                    name="contextObjective"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                  >
                    <option value="">Selecciona...</option>
                    <option value="empleado">Empleado en empresa</option>
                    <option value="freelancer">Freelancer independiente</option>
                    <option value="startup">Startup/Emprendimiento</option>
                    <option value="estudiante">Estudiante/Aprendiendo</option>
                    <option value="consultor">Consultor/Servicios</option>
                    <option value="team-lead">Líder de equipo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white mb-1 text-xs text-left">Urgencia</label>
                  <select
                    name="urgencyTimeline"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                  >
                    <option value="">Selecciona...</option>
                    <option value="inmediato">🔥 Inmediato</option>
                    <option value="proximas-semanas">⚡ Próximas semanas</option>
                    <option value="proximos-meses">📅 Próximos meses</option>
                    <option value="largo-plazo">🌱 Largo plazo</option>
                  </select>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}
              <br/>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-500 mt-10  rounded-full text-brand-900 font-bold py-4 px-8 text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    Registrando...
                  </div>
                ) : (
                  "Confirmar mi lugar 🎯"
                )}
              </button>
            </fetcher.Form>
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Form Modal */}
      <AnimatePresence>
        {showWebinarForm && <WebinarForm />}
      </AnimatePresence>

      {/* Banner Sticky del Webinar */}
      <AnimatePresence>
        {showStickyBanner && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="fixed flex items-center top-0 left-0 right-0 z-50 bg-gradient-to-r from-claude-700 via-claude-600 to-claude-500 text-white h-fit md:h-14 px-4 shadow-2xl cursor-pointer"
            onClick={() => navigate('/claude')}
          >
            <div className="container mx-auto flex  items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="animate-pulse text-2xl">🔥</span>
                <div>
                  <p className="font-black text-sm md:text-base">
                    WEBINAR GRATIS - JUEVES 14 AGO: "De Junior a Senior con Claude Code"
                  </p>
                  <p className="text-xs opacity-90">
                    Sin compromiso • Sin tarjeta • 100% práctico
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWebinarForm(true);
                }}
                className="bg-white flex gap-1 text-claude-700 font-black px-6 py-2 rounded-full text-sm  transition-colors"
              >
                RESERVAR <span className="hidden md:block">MI LUGAR →</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};