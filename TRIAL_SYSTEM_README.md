# RealOffer 3-Month Premium Trial System

## Overview

The RealOffer platform now includes a 3-month premium trial system for all new users. This system automatically grants premium access to new users for 3 months from their signup date, after which they need to upgrade to continue using premium features.

## Features

### Automatic Trial Assignment
- All new users automatically receive a 3-month premium trial
- Trial starts immediately upon account creation
- Trial end date is set to 3 months from signup date

### Trial Status Tracking
- `isOnTrial`: Boolean flag indicating if user is on trial
- `trialStartDate`: Date when trial began
- `trialEndDate`: Date when trial expires
- Virtual fields for easy status checking

### Automatic Expiration
- Daily cron job checks for expired trials at 2 AM
- Automatically expires trials for users who haven't upgraded
- Sends expiration notification emails

### Trial Notifications
- Hourly checks for trials expiring soon
- Sends reminder emails at 7 days, 3 days, and 1 day before expiration
- Sends final expiration email when trial ends

## Database Schema Changes

### User Model Updates
```javascript
// New fields added to User schema
trialStartDate: { type: Date },
trialEndDate: { type: Date },
isOnTrial: { type: Boolean, default: false },

// Virtual fields
isCurrentlyOnTrial: // Returns true if trial is still active
trialStatus: // Returns 'no_trial', 'active', or 'expired'

// Method
hasPremiumAccess(): // Returns true if user has premium (paid or trial)
```

## Backend Implementation

### Services
- **TrialExpirationService**: Handles trial expiration and notifications
- **EmailService**: Sends trial-related emails

### Routes
- **Trial Management Routes**: Admin-only routes for managing trials
  - `/api/trial-management/stats` - Get trial statistics
  - `/api/trial-management/expire-trials` - Manual trial expiration
  - `/api/trial-management/expired-users` - List users with expired trials
  - `/api/trial-management/expiring-soon` - List users with trials expiring soon

### Cron Jobs
- **Daily at 2 AM**: Check and expire trials
- **Every hour**: Check for trials expiring soon and send notifications

## Frontend Implementation

### Components
- **TrialStatus**: Displays trial information to users
- **trialUtils**: Utility functions for trial status checking

### Features
- Trial status display on dashboard
- Automatic upgrade prompts when trial is expiring
- Responsive design with different urgency levels

## Email Templates

### Trial Expiration Reminders
- 7 days before expiration
- 3 days before expiration  
- 1 day before expiration

### Trial Expiration Notification
- Sent when trial expires
- Includes upgrade link and feature highlights

## Usage

### For New Users
1. User signs up for RealOffer
2. Automatically receives 3-month premium trial
3. Can use all premium features during trial
4. Receives notifications as trial nears expiration
5. Must upgrade to continue after trial ends

### For Administrators
```bash
# View trial statistics
GET /api/trial-management/stats

# Manually trigger trial expiration check
POST /api/trial-management/expire-trials

# View users with expired trials
GET /api/trial-management/expired-users

# View users with trials expiring soon
GET /api/trial-management/expiring-soon?days=7
```

### Migration Script
For existing users without trial information:
```bash
node scripts/setupTrialForExistingUsers.js
```

## Configuration

### Environment Variables
- `FRONTEND_URL`: Used in email templates for upgrade links
- `SENDGRID_API_KEY`: Required for sending trial emails

### Cron Schedule
- Trial expiration check: `0 2 * * *` (Daily at 2 AM)
- Notification check: `0 * * * *` (Every hour)

## Premium Access Logic

The system uses the `hasPremiumAccess()` method to determine if a user has premium features:

```javascript
// User has premium access if:
user.isPremium === true  // Paid premium subscription
// OR
user.isOnTrial === true && user.trialEndDate > now  // Active trial
```

## Testing

### Manual Testing
1. Create a new user account
2. Verify trial information is set correctly
3. Check trial status display on dashboard
4. Test trial expiration by manually updating trial end date
5. Verify email notifications are sent

### Admin Testing
1. Use admin routes to view trial statistics
2. Manually trigger trial expiration
3. Check expired users list
4. Verify trial management functionality

## Monitoring

### Logs to Monitor
- Trial expiration service logs
- Email sending logs
- Trial status changes

### Key Metrics
- Number of active trials
- Trial conversion rate
- Trial expiration rate
- Email delivery success rate

## Troubleshooting

### Common Issues
1. **Trials not expiring**: Check cron job is running
2. **Emails not sending**: Verify SendGrid configuration
3. **Trial status not updating**: Check database connection
4. **Frontend not showing trial status**: Verify user data includes trial fields

### Debug Commands
```bash
# Check trial service status
GET /api/trial-management/status

# View trial statistics
GET /api/trial-management/stats

# Manually expire trials
POST /api/trial-management/expire-trials
```

## Future Enhancements

- Trial extension functionality
- Custom trial durations
- A/B testing for trial lengths
- Trial conversion analytics
- Trial-specific onboarding flows 