import type { Route } from './+types/api.analytics'
import { trackAnalyticsEvent } from '~/.server/services/analytics'

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const data = await request.json()
    
    // Validar que los datos tengan la estructura esperada
    if (!data.type || !data.postId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Trackear el evento
    await trackAnalyticsEvent({
      type: data.type,
      postId: data.postId,
      metadata: data.metadata || {},
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return Response.json({ error: 'Failed to track event' }, { status: 500 })
  }
}

// GET request para verificar que el endpoint está funcionando
export async function loader() {
  return Response.json({ status: 'Analytics endpoint is working' })
}