import type { Route } from './+types/api.analytics'
import { trackAnalyticsEvent } from '~/.server/services/analytics'

// Mismo filtro que api/video-analytics.ts
const BOT_UA =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|slackbot|discordbot|telegrambot|twitterbot|linkedinbot|embedly|quora|pinterest|bitlybot|vkshare|redditbot|applebot|bingbot|googlebot|yandex|duckduckbot|semrush|ahrefs|headless|lighthouse|python-requests|curl|wget|axios|node-fetch/i

function getDeviceType(userAgent: string): string {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

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

    // Crawlers y previews de enlaces no cuentan como lectores
    const userAgent = request.headers.get('user-agent') || ''
    if (!userAgent || BOT_UA.test(userAgent)) {
      return Response.json({ success: true, ignored: true })
    }

    // Trackear el evento
    await trackAnalyticsEvent({
      type: data.type,
      postId: data.postId,
      sessionId: typeof data.sessionId === 'string' && data.sessionId ? data.sessionId.slice(0, 64) : undefined,
      userAgent: userAgent.slice(0, 300),
      deviceType: getDeviceType(userAgent),
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