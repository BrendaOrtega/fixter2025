# Implementation Plan

- [x] 1. Setup database and services (Effect TS)

  - Extend Prisma schema with AudioCache, BlogAnalytics models
  - Create S3 service using Effect for file operations
  - Create OpenRouter TTS service using Effect
  - Add environment variables for APIs and S3
  - _Requirements: 4.1, 4.2, 4.3_

- [-] 2. Build core audio generation service

  - Create audio service with TTS generation using Effect
  - Implement S3 upload and caching with pre-signed URLs
  - Add cost calculation and basic tracking
  - _Requirements: 2.1, 2.2, 2.3, 4.5_

- [ ] 3. Create minimalist AudioPlayer component

  - Build clean, elegant AudioPlayer with useReducer
  - Add play/pause, seek, volume controls
  - Implement loading states and error handling
  - Make component responsive and reusable
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.1, 5.2, 2.5_

- [ ] 4. Create API routes for audio

  - Build POST route for on-demand audio generation
  - Create GET route for serving cached audio
  - Add rate limiting and error handling
  - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [ ] 5. Integrate AudioPlayer into blog posts

  - Add AudioPlayer to post.tsx route
  - Implement "Generate Audio" button with states
  - Handle success/error flows and auto-play
  - _Requirements: 1.1, 1.4, 1.5_

- [ ] 6. Implement caching and cleanup

  - Create S3 cache checking mechanism
  - Add cache invalidation on post updates
  - Setup S3 lifecycle policies for cleanup
  - _Requirements: 2.3, 2.4_

- [ ] 7. Add basic analytics tracking

  - Implement blog analytics service using Effect
  - Track page views, reading time, scroll depth
  - Track audio generation and playback events
  - Add click tracking with normalized coordinates
  - _Requirements: 7.1, 7.2, 7.3, 3.1, 3.2_

- [ ] 8. Build /admin/blog dashboard

  - Create admin route at /admin/blog
  - Add quick stats: total views, audio generations, top posts
  - Show simple charts for engagement metrics
  - Display audio vs text preference trends
  - _Requirements: 7.4, 7.5, 3.3, 3.4_

- [ ] 9. Add playback persistence

  - Implement localStorage for playback position
  - Add resume functionality when returning to posts
  - _Requirements: 5.3, 5.4_

- [ ] 10. Final polish and accessibility
  - Add ARIA labels and keyboard navigation
  - Implement end-of-audio options
  - Add screen reader support
  - _Requirements: 5.5, 6.4_
