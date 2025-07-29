import { json, type ActionFunctionArgs } from '@remix-run/node'
import { analytics } from '~/services/analytics.server'
import { Effect } from 'effect'

type AnalyticsEvent = {
  type: string
  postId?: string
  pathname: string
  metadata?: Record<string, unknown>
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const event = (await request.json()) as AnalyticsEvent
    
    // Validar el evento
    if (!event.type || !event.pathname) {
      return json({ error: 'Invalid event data' }, { status: 400 })
    }

    // Procesar el evento de forma asíncrona sin bloquear la respuesta
    Effect.runFork(
      Effect.gen(function* () {
        yield* analytics.track({
          type: event.type,
          postId: event.postId,
          pathname: event.pathname,
          metadata: event.metadata || {},
        })
      })
    )

    return json({ success: true })
  } catch (error) {
    console.error('Error processing analytics event:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Evitar que se manejen otras peticiones HTTP
export const loader = () => {
  return json({ error: 'Method not allowed' }, { status: 405 })
}
