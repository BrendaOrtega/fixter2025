import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { BiRocket, BiX } from "react-icons/bi";
import { HiSparkles } from "react-icons/hi";

export const FloatingPromo = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si el usuario ya lo desechó y si aún está vigente
    const dismissedData = localStorage.getItem('agentes-promo-dismissed');
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const oneDayInMs = 24 * 60 * 60 * 1000; // 24 horas
      
      if (Date.now() - timestamp < oneDayInMs) {
        setIsDismissed(true);
        return;
      } else {
        // Ha pasado el tiempo, remover y mostrar de nuevo
        localStorage.removeItem('agentes-promo-dismissed');
      }
    }

    // Mostrar después de 3 segundos de carga
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('agentes-promo-dismissed', JSON.stringify({
      timestamp: Date.now()
    }));
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handleClick = () => {
    navigate('/agentes');
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-6 left-6 z-[100]"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Contenedor unificado para hover con área invisible */}
          <div className="relative">
            {/* Área invisible que conecta el botón con la card */}
            {isExpanded && (
              <div className="absolute bottom-0 left-0 w-80 h-16 bg-transparent pointer-events-auto" />
            )}
            
            {/* Expanded card - se muestra primero para que esté debajo */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: -10, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-full left-0 mb-0 w-80 bg-agentes-dark rounded-2xl shadow-xl border border-agentes-primary/40 p-4 z-10"
                >
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <BiX className="w-5 h-5" />
                  </button>

                  <div className="pr-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🤖</span>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        Nuevo Taller
                      </h3>
                    </div>
                    
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                      Construcción de Agentes IA drag & drop
                    </h4>
                    
                    <p className="text-xs text-agentes-tertiary mb-4">
                      Aprende a crear agentes inteligentes sin programar. 
                      4 sesiones prácticas con proyectos incluidos.
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        🎁 Sesión gratis
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClick}
                        className="bg-gradient-to-r from-agentes-primary to-agentes-secondary text-agentes-dark text-xs font-bold px-4 py-2 rounded-full transition-colors"
                      >
                        Ver Taller →
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compact floating button */}
            <motion.div
              animate={{
                scale: isExpanded ? 1.05 : 1,
                rotateY: isExpanded ? 5 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="relative cursor-pointer"
            >
            {/* Notification badge */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                backgroundColor: ["#8ADAB1", "#8ADAB1", "#8ADAB1"]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute -top-2 -right-2 w-4 h-4 bg-agentes-primary rounded-full border-2 border-agentes-dark flex items-center justify-center z-30"
            >
              <HiSparkles className="w-2 h-2 text-white" />
            </motion.div>

            {/* Main button */}
            <motion.div
              className="relative z-20 bg-gradient-to-r from-agentes-primary to-agentes-secondary text-white p-4 rounded-2xl shadow-2xl border border-agentes-primary/30"
              whileHover={{ boxShadow: "0 20px 40px rgba(176, 204, 242, 0.3)" }}
              onClick={handleClick}
            >
              <div className="flex items-center gap-3">
                <BiRocket className="text-2xl text-agentes-dark" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="whitespace-nowrap text-agentes-dark">
                        <p className="font-bold text-sm">Agentes IA</p>
                        <p className="text-xs opacity-90">Sin código • Sesión gratis</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            </motion.div>

            {/* Floating pulse effect */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="absolute inset-0 bg-agentes-primary rounded-2xl -z-10"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};