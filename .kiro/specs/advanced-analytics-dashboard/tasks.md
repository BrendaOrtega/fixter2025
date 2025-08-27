# Implementation Plan

- [x] 1. Fix analytics data collection endpoint

  - Update `/api/analytics` route to use `BlogAnalytics` table instead of `analyticsEvent`
  - Map `metadata.x` and `metadata.y` to `clickX` and `clickY` fields properly
  - Add basic validation for coordinate data
  - Test that heatmap coordinates are being saved correctly
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 2. Create basic user cohort analysis queries

  - Write database queries to identify new vs returning users by session
  - Calculate simple retention metrics (users who return within 7 days)
  - Create function to segment users by engagement level (reading time)
  - Add query to track content type preferences by user cohort
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 3. Build heatmap visualization component

  - Create React component that renders click density as colored overlay
  - Fetch click coordinate data from database for specific posts
  - Implement simple density calculation (group nearby clicks)
  - Make heatmap responsive to different screen sizes
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 4. Create analytics dashboard page

  - Build dashboard route `/analytics` with basic layout
  - Display cohort metrics (new users, returning users, retention rate)
  - Show list of posts with heatmap previews
  - Add date range filter for analytics data
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. Add simple content performance scoring

  - Create algorithm that scores posts based on reading time and scroll depth
  - Calculate and display top-performing content list
  - Show performance trends (this week vs last week)
  - Add basic recommendations based on performance patterns
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Polish dashboard and add export functionality
  - Improve dashboard UI with better charts and styling
  - Add CSV export for analytics data
  - Implement basic error handling and loading states
  - Test full analytics flow and fix any remaining issues
  - _Requirements: 4.5, 6.2, 6.4_
