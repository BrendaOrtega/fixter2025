import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router'

// Tamaño de la ventana para normalizar las coordenadas
const getWindowSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
})

type ClickEvent = {
  x: number // 0-1
  y: number // 0-1
  element: string
  text?: string
}

type ScrollEvent = {
  depth: number // 0-1
  timeOnPage: number // segundos
}

type TrackEvent = {
  type: string
  postId?: string
  metadata?: Record<string, unknown>
}

const useAnalytics = (postId?: string) => {
  const location = useLocation()
  const startTime = Date.now()
  let maxScrollDepth = 0
  let scrollTimeout: NodeJS.Timeout

  // Función para normalizar coordenadas de clic
  const getNormalizedClickData = (e: MouseEvent): ClickEvent => {
    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    
    // Obtener el texto del elemento (limitado a 100 caracteres)
    let text = target.textContent?.trim().substring(0, 100)
    if (text === '') text = undefined

    return {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      element: target.tagName,
      text,
    }
  }

  // Trackear clics
  const trackClick = useCallback((e: MouseEvent) => {
    if (!postId) return
    
    const clickData = getNormalizedClickData(e)
    
    // Ignorar clics en elementos interactivos comunes
    const interactiveElements = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']
    if (interactiveElements.includes(clickData.element)) {
      return
    }

    // Enviar evento de clic
    window.trackEvent({
      type: 'click',
      postId,
      metadata: {
        ...clickData,
        viewport: getWindowSize(),
      },
    })
  }, [postId])

  // Trackear desplazamiento
  const trackScroll = useCallback(() => {
    if (!postId) return
    
    const scrollY = window.scrollY
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const depth = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0
    
    // Solo actualizar si el desplazamiento es mayor al máximo registrado
    if (depth > maxScrollDepth) {
      maxScrollDepth = depth
      
      // Usar debounce para no saturar con eventos de desplazamiento
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const timeOnPage = (Date.now() - startTime) / 1000 // segundos
        
        window.trackEvent({
          type: 'scroll',
          postId,
          metadata: {
            depth,
            timeOnPage,
            viewport: getWindowSize(),
          },
        })
      }, 100)
    }
  }, [postId])

  // Trackear tiempo de lectura
  const trackReadingTime = useCallback(() => {
    if (!postId) return
    
    const timeOnPage = (Date.now() - startTime) / 1000 // segundos
    
    // Solo registrar si ha pasado al menos 5 segundos
    if (timeOnPage >= 5) {
      window.trackEvent({
        type: 'read_time',
        postId,
        metadata: {
          seconds: Math.round(timeOnPage),
          viewport: getWindowSize(),
        },
      })
    }
  }, [postId])

  // Efecto para configurar los event listeners
  useEffect(() => {
    if (!postId) return
    
    // Trackear vista de página
    window.trackEvent({
      type: 'page_view',
      postId,
      metadata: {
        referrer: document.referrer,
        viewport: getWindowSize(),
      },
    })

    // Configurar event listeners
    window.addEventListener('click', trackClick, { passive: true })
    window.addEventListener('scroll', trackScroll, { passive: true })
    window.addEventListener('beforeunload', trackReadingTime)

    // Limpiar event listeners al desmontar
    return () => {
      window.removeEventListener('click', trackClick)
      window.removeEventListener('scroll', trackScroll)
      window.removeEventListener('beforeunload', trackReadingTime)
      
      // Asegurarse de registrar el tiempo de lectura al salir
      trackReadingTime()
    }
  }, [postId, trackClick, trackScroll, trackReadingTime])

  // Función para rastrear eventos personalizados
  const trackEvent = useCallback((event: Omit<TrackEvent, 'postId'>) => {
    if (!postId) return
    
    window.trackEvent({
      ...event,
      postId,
    })
  }, [postId])

  return { trackEvent }
}

// Asegurarse de que la función trackEvent esté disponible en el objeto window
declare global {
  interface Window {
    trackEvent: (event: TrackEvent) => void
  }
}

// Inicializar la función global si no existe
if (typeof window !== 'undefined' && !window.trackEvent) {
  window.trackEvent = async (event: TrackEvent) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }
}

export default useAnalytics
