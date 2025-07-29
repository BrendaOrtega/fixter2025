import type { ActionFunction } from 'react-router';
import { db } from '~/.server/db';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const event = await request.json();
    
    // Basic validation
    if (!event.type) {
      return new Response(
        JSON.stringify({ error: 'Event type is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save the analytics event to the database
    await db.analyticsEvent.create({
      data: {
        type: event.type,
        postId: event.postId || null,
        metadata: event.metadata || {},
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                  request.headers.get('x-real-ip') ||
                  'unknown',
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing analytics event:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process analytics event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// This ensures we only respond to POST requests
export const loader = () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
