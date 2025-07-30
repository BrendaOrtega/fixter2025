# Advanced Analytics Dashboard Design Document

## Overview

Fix current analytics collection and add three key features: user cohort analysis, heatmap visualization, and a simple dashboard. Focus on minimal viable implementation.

## Architecture

Simple flow: User interactions → Fixed analytics API → Database → Dashboard queries → UI components

## Components and Interfaces

### 1. Fix Analytics Collection

**Problem**: Current system saves to wrong table and doesn't map coordinates properly.
**Solution**: Update `/api/analytics` to use `BlogAnalytics` table and map `metadata.x/y` to `clickX/clickY`.

```typescript
// Fixed endpoint saves to correct table with proper mapping
await db.blogAnalytics.create({
  data: {
    postId: event.postId,
    sessionId: generateSessionId(),
    event: event.type,
    clickX: event.metadata?.x ? event.metadata.x * 100 : null,
    clickY: event.metadata?.y ? event.metadata.y * 100 : null,
    // ... other fields
  },
});
```

### 2. User Cohort Analysis

**Purpose**: Track user progression from casual to regular readers.
**Implementation**: Simple queries to group users by behavior patterns.

```typescript
// Basic cohort queries
const newUsers = await db.blogAnalytics.groupBy({
  by: ["sessionId"],
  where: { timestamp: { gte: weekAgo } },
});

const returningUsers = await db.blogAnalytics.groupBy({
  by: ["sessionId"],
  having: { _count: { gt: 1 } },
});
```

### 3. Heatmap Visualization

**Purpose**: Show click density on posts.
**Implementation**: Aggregate click coordinates and render as overlay.

```typescript
// Get click data for heatmap
const clicks = await db.blogAnalytics.findMany({
  where: { postId, event: "click", clickX: { not: null } },
  select: { clickX: true, clickY: true },
});

// Simple density calculation
const heatmapData = aggregateClicks(clicks);
```

### 4. Simple Dashboard

**Purpose**: Display cohort data and heatmaps in one page.
**Implementation**: Single dashboard route with basic charts.

## Data Models

Use existing `BlogAnalytics` table - just fix the data saving.

## Error Handling

Basic try/catch blocks and console logging. Keep it simple.

## Testing Strategy

Manual testing during development. Add basic unit tests for data queries.

## Implementation Approach

1. Fix analytics collection first
2. Add basic cohort queries
3. Create simple heatmap visualization
4. Build minimal dashboard UI
5. Add basic performance scoring
6. Polish and optimize
