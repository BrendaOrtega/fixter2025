# Implementation Plan

- [x] 1. Setup database and services (Effect TS)

  - Extend Prisma schema with AudioCache, BlogAnalytics models
  - Create S3 service using Effect for file operations
  - Create OpenRouter TTS service using Effect
  - Add environment variables for APIs and S3
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Build core audio generation service

  - Create audio service with TTS generation using Effect
  - Implement S3 upload and caching with pre-signed URLs
  - Add basic tracking
  - _Requirements: 2.1, 2.2, 2.3, 4.5_

- [x] 3. Create minimalist AudioPlayer component

  - Build clean, elegant AudioPlayer with useReducer
  - Add play/pause, seek, volume controls
  - Implement loading states and error handling
  - Make component responsive and reusable
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.1, 5.2, 2.5_

- [x] 4. Create API routes for audio

  - Build POST route for on-demand audio generation
  - Create GET route for serving cached audio
  - Add rate limiting and error handling
  - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [ ] 5. Add voice selection for audio generation

  - [ ] 5.1 Create voice configuration constants

    - Define available OpenRouter TTS voices with metadata (name, description, language, gender)
    - Create voice preview samples or descriptions for each option
    - Add voice categorization (male, female, neutral, accents)
    - Export voice constants with proper TypeScript types
    - _Requirements: 6.1, 6.2_

  - [ ] 5.2 Update AudioPlayer component with voice selector

    - Add voice selection dropdown/modal in the initial "Generate Audio" state
    - Create VoiceSelector component with voice previews and descriptions
    - Implement voice selection state management in AudioPlayer reducer
    - Add voice selection to the generation button interaction flow
    - Show selected voice in the audio player header when audio is ready
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 5.3 Enhance audio generation hook for voice selection

    - Update useAudioGeneration hook to accept voice parameter
    - Modify generateAudio function to include voice in API request
    - Add voice validation and fallback to default voice
    - Update hook state to track selected voice
    - _Requirements: 2.1, 2.2_

  - [ ] 5.4 Update API routes to handle voice parameter

    - Modify /api/audio POST route to accept voice parameter from formData
    - Update audio service to pass voice option to TTS service
    - Add voice information to AudioCache database records
    - Include voice metadata in analytics tracking
    - _Requirements: 2.1, 2.2, 4.5_

  - [ ] 5.5 Update database schema for voice tracking

    - Add voice field to AudioCache model to store selected voice
    - Update Prisma schema and regenerate client
    - Add voice information to BlogAnalytics metadata for generation events
    - Create database migration if needed
    - _Requirements: 4.1, 4.2_

  - [ ] 5.6 Implement voice-based caching strategy

    - Update cache key generation to include voice parameter
    - Modify S3 key generation to include voice in path structure
    - Update cache checking logic to consider voice when looking for existing audio
    - Ensure different voices generate separate cached files
    - _Requirements: 2.3, 2.4_

  - [ ] 5.7 Add voice selection UI components

    - Create VoiceOption component for individual voice display
    - Implement voice preview functionality (if available)
    - Add voice selection modal/dropdown with search and filtering
    - Create responsive design for mobile voice selection
    - Add accessibility features (ARIA labels, keyboard navigation)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 5.8 Update error handling for voice-related issues
    - Add voice validation error messages
    - Handle unsupported voice errors from OpenRouter
    - Update error utilities to include voice-specific error handling
    - Add fallback voice selection when preferred voice fails
    - _Requirements: 5.1, 5.2_

- [x] 6. Integrate AudioPlayer into blog posts

  - Add AudioPlayer to post.tsx route
  - Implement "Generate Audio" button with states
  - Handle success/error flows and auto-play
  - _Requirements: 1.1, 1.4, 1.5_

- [ ] 7. Implement caching and cleanup

  - Create S3 cache checking mechanism
  - Add cache invalidation on post updates
  - Setup S3 lifecycle policies for cleanup
  - _Requirements: 2.3, 2.4_

- [ ] 8. Add basic analytics tracking

  - Implement blog analytics service using Effect
  - Track page views, reading time, scroll depth
  - Track audio generation and playback events
  - Add click tracking with normalized coordinates
  - _Requirements: 7.1, 7.2, 7.3, 3.1, 3.2_

- [ ] 9. Build /admin/blog dashboard

  - Create admin route at /admin/blog
  - Add quick stats: total views, audio generations, top posts
  - Show simple charts for engagement metrics
  - Display audio vs text preference trends
  - _Requirements: 7.4, 7.5, 3.3, 3.4_

- [ ] 10. Add playback persistence

  - Implement localStorage for playback position
  - Add resume functionality when returning to posts
  - _Requirements: 5.3, 5.4_

- [ ] 11. Final polish and accessibility
  - Add ARIA labels and keyboard navigation
  - Implement end-of-audio options
  - Add screen reader support
  - _Requirements: 5.5, 6.4_
