# AI Chat Daily Usage Limits

## Overview

Implemented a daily usage cap system for the AI chat feature with a subtle circular progress indicator similar to Cursor's design. Users are limited to 10,000 tokens per day, with real-time usage tracking and visual feedback.

## Token Calculation

Based on the user's calculation:
- **360 tokens = 3.6% usage**
- **100% usage = 10,000 tokens per day**

## Backend Implementation

### 1. User Usage Model (`UserUsage.js`)

**Features:**
- Tracks daily AI chat usage per user
- Automatic daily reset at midnight
- Compound index for one record per user per day
- Helper methods for usage calculations

**Key Methods:**
- `getOrCreateDailyUsage(userId)` - Gets or creates daily usage record
- `addTokens(tokens)` - Adds tokens to daily usage
- `hasExceededLimit(dailyLimit)` - Checks if limit exceeded
- `getUsagePercentage(dailyLimit)` - Calculates usage percentage

### 2. Enhanced Chat Controller

**Usage Tracking Integration:**
- Tracks total tokens (input + output) per request
- Checks daily limit before processing
- Sends usage updates during streaming
- Returns error when limit exceeded

**New Endpoints:**
- `GET /api/chat/enhanced/usage` - Get current usage data
- Enhanced streaming with usage updates

### 3. Usage Limit Enforcement

**Daily Limit: 10,000 tokens**
- Enforced at the backend level
- Real-time tracking during streaming
- Graceful error handling for limit exceeded

## Frontend Implementation

### 1. Usage Indicator Design

**Circular Progress Bar:**
- SVG-based circular progress indicator
- Color-coded states:
  - **Blue (0-49%)**: Low usage
  - **Orange (50-79%)**: Medium usage  
  - **Red (80-100%)**: High usage
- Percentage display in center
- Smooth animations and transitions

### 2. UI Changes

**Removed Elements:**
- Token count display
- Processing time display
- Header info section

**Added Elements:**
- Subtle usage indicator in header
- Real-time usage updates
- Color-coded visual feedback

### 3. User Experience

**Visual Feedback:**
- Immediate usage updates after each request
- Color changes based on usage level
- Percentage display for transparency
- Responsive design for mobile

**Error Handling:**
- Clear message when daily limit exceeded
- Graceful degradation
- User-friendly error messages

## Technical Details

### Database Schema

```javascript
{
  userId: ObjectId,
  date: Date,
  aiChatTokens: Number,
  aiChatRequests: Number,
  lastReset: Date
}
```

### API Response Format

**Usage Update:**
```json
{
  "type": "usage_update",
  "usagePercentage": 62,
  "tokensUsed": 6200,
  "dailyLimit": 10000
}
```

**Current Usage:**
```json
{
  "usagePercentage": 62,
  "tokensUsed": 6200,
  "dailyLimit": 10000,
  "requestsToday": 15
}
```

### CSS Implementation

**Circular Progress:**
- SVG circles with stroke-dasharray/offset
- Smooth transitions
- Responsive sizing
- Color state management

## Benefits

### 1. **Cost Control**
- Prevents excessive API usage
- Predictable daily costs
- Fair usage distribution

### 2. **User Experience**
- Subtle, non-intrusive design
- Clear usage feedback
- Professional appearance
- Familiar interface pattern

### 3. **System Stability**
- Prevents abuse
- Load balancing
- Resource management
- Scalable architecture

## Future Enhancements

### Potential Improvements:
- **Tiered Limits**: Different limits for different user types
- **Usage Analytics**: Detailed usage reports
- **Custom Limits**: User-configurable limits
- **Usage History**: Historical usage data
- **Notifications**: Usage alerts at certain thresholds

### Advanced Features:
- **Rolling Windows**: 24-hour rolling limits vs daily reset
- **Token Optimization**: Smarter token usage
- **Usage Insights**: Usage patterns and recommendations
- **Premium Features**: Higher limits for premium users
