# OfferDueReminder Component

A dynamic offer due date reminder component that displays time-sensitive notifications based on the proximity to an offer due date.

## Features

- **Dynamic Time Calculation**: Automatically calculates the time remaining until the offer due date
- **Progressive Urgency**: Changes appearance and messaging based on time remaining:
  - **Normal**: More than 7 days remaining
  - **Warning**: Within 7 days remaining
  - **Urgent**: Within 24 hours remaining (with pulsing animation)
  - **Expired**: After the due date has passed
- **Responsive Design**: Adapts to different screen sizes
- **Accessible**: Includes proper ARIA labels and semantic HTML

## Usage

```jsx
import OfferDueReminder from './components/OfferDueReminder/OfferDueReminder';

// Basic usage
<OfferDueReminder offerDueDate="2024-12-20T17:00:00Z" />

// The component will automatically:
// - Calculate time remaining
// - Display appropriate styling
// - Show relevant icon and message
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `offerDueDate` | `string` | Yes | ISO 8601 date string of the offer due date |

## Time Thresholds

- **More than 7 days**: "Offers due in X days" (blue styling)
- **Within 7 days**: "Offers due in X days" (yellow warning styling)
- **Within 24 hours**: "Offers due in X hours" (red urgent styling with pulse animation)
- **Within 1 hour**: "Offers due in X minutes" (red urgent styling)
- **Expired**: "Offers closed" (gray styling)

## Styling

The component uses CSS classes that correspond to the urgency level:
- `.offer-due-reminder.normal` - Blue styling for normal timeframe
- `.offer-due-reminder.warning` - Yellow styling for warning timeframe
- `.offer-due-reminder.urgent` - Red styling with pulse animation for urgent timeframe
- `.offer-due-reminder.expired` - Gray styling for expired offers

## Integration

The component is integrated into:
- `ListingOverview` - For seller's view of their listings
- `BuyerPackageListingOverview` - For buyer's view of property packages

## Testing

The component includes comprehensive tests covering:
- All urgency levels
- Null/undefined date handling
- CSS class application
- Text content verification

Run tests with:
```bash
npm test -- --testPathPattern="OfferDueReminder"
``` 