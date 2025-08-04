# Offer Due Date Notification System

This system automatically sends email notifications to all buyer parties (buyer agents and buyers) when a listing's offer due date is approaching.

## Features

- **Automatic Notifications**: Sends emails at 3 days, 1 day, and 3 hours before the offer due date
- **Comprehensive Coverage**: Notifies all active buyer packages for each listing
- **Professional Email Templates**: Beautiful, responsive email templates with clear call-to-action
- **Admin Controls**: API endpoints for testing and monitoring the system
- **Error Handling**: Robust error handling with detailed logging

## How It Works

### 1. Scheduled Checks
The system runs a cron job every hour to check for listings with upcoming offer due dates.

### 2. Notification Thresholds
- **3 Days**: First reminder sent 3 days before the offer due date
- **1 Day**: Second reminder sent 1 day before the offer due date  
- **3 Hours**: Final urgent reminder sent 3 hours before the offer due date

### 3. Recipients
For each listing, notifications are sent to:
- All buyers who have created buyer packages for the listing
- All buyer agents who have created buyer packages for the listing

## Email Template

The notification emails include:
- Property address and details
- Time remaining until the offer due date
- Recipient's role (buyer or buyer agent)
- Direct link to the RealOffer dashboard
- Professional styling with RealOffer branding

## API Endpoints

### For Listing Agents
- `GET /api/offer-due-date-notifications/listing/:listingId/upcoming`
  - Get upcoming notification schedule for a specific listing

### For Administrators
- `POST /api/offer-due-date-notifications/test/:listingId`
  - Test notification for a specific listing
  - Body: `{ "timeRemaining": "3 days" }`

- `POST /api/offer-due-date-notifications/trigger-all`
  - Manually trigger all pending notifications

- `GET /api/offer-due-date-notifications/status`
  - Check the status of the notification service

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:
```
SENDGRID_API_KEY=your_sendgrid_api_key
FRONTEND_URL=https://your-frontend-url.com
```

### Cron Schedule
The system checks every hour at minute 0. To modify the schedule, edit the cron expression in `offerDueDateNotificationService.js`:

```javascript
// Current: Every hour
cron.schedule('0 * * * *', () => {
  // Check for notifications
});

// Example: Every 30 minutes
cron.schedule('*/30 * * * *', () => {
  // Check for notifications
});
```

## Testing

### Manual Test
Run the test script to verify the system:

```bash
cd myapp-backend
node scripts/testOfferNotifications.js
```

This script will:
1. Find or create a test listing with an offer due date
2. Create a test buyer package
3. Test the notification service
4. Show upcoming notification schedule

### API Testing
Use the admin endpoints to test notifications:

```bash
# Test notification for a specific listing
curl -X POST http://localhost:8000/api/offer-due-date-notifications/test/LISTING_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timeRemaining": "3 days"}'

# Check service status
curl -X GET http://localhost:8000/api/offer-due-date-notifications/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring

### Logs
The system logs all activities:
- When cron jobs run
- Number of listings found with upcoming due dates
- Notification send attempts and results
- Errors and failures

### Example Log Output
```
Running offer due date notification check...
Found 2 listings with upcoming due dates
Sending 3 days notification for listing: 123 Main St, City, CA
Sent 3 days notification to john@example.com for property 123 Main St, City, CA
Sent 3 days notifications for listing 123 Main St, City, CA: 1 successful, 0 failed
```

## Troubleshooting

### Common Issues

1. **No notifications being sent**
   - Check if listings have `offerDueDate` set
   - Verify buyer packages exist and are active
   - Check SendGrid API key configuration

2. **Emails not received**
   - Check spam/junk folders
   - Verify email addresses in buyer packages
   - Check SendGrid delivery logs

3. **Cron job not running**
   - Ensure the service is properly initialized in `server.js`
   - Check server logs for cron initialization messages

### Debug Mode
To enable more detailed logging, add this to your environment:
```
DEBUG_OFFER_NOTIFICATIONS=true
```

## Security

- All admin endpoints require authentication and admin role
- Email addresses are validated before sending
- Failed notifications are logged but don't stop the system
- No sensitive data is logged

## Performance

- Notifications are sent in parallel for each listing
- Database queries are optimized with proper indexing
- Failed notifications don't block other notifications
- System handles large numbers of listings efficiently

## Future Enhancements

Potential improvements:
- Email templates customization per listing agent
- SMS notifications in addition to email
- Notification preferences per user
- Integration with calendar systems
- Advanced scheduling options 