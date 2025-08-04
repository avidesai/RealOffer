const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Generate email verification token
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate password reset token
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Send email verification email
  async sendEmailVerification(userEmail, verificationToken, firstName) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: userEmail,
      subject: 'Verify your RealOffer account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Welcome to RealOffer!</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for signing up for RealOffer! To complete your registration, 
              please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="color: #666; line-height: 1.6;">
              This link will expire in 24 hours. If you didn't create a RealOffer account, 
              you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email verification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordReset(userEmail, resetToken, firstName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: userEmail,
      subject: 'Reset your RealOffer password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your RealOffer password. Click the button below 
              to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc3545; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all;">
              ${resetUrl}
            </p>
            <p style="color: #666; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request a password reset, 
              you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Password reset email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send sharing email with recipient information
  async sendSharingEmail(recipientEmail, recipientName, role, shareUrl, customMessage, senderName, propertyAddress) {
    const roleText = role === 'buyerAgent' ? 'Buyer Agent' : 'Buyer';
    const subject = `${senderName} has shared a property with you`;
    
    // Add recipient information to the share URL
    const urlWithParams = new URL(shareUrl);
    urlWithParams.searchParams.set('firstName', recipientName.split(' ')[0]);
    urlWithParams.searchParams.set('lastName', recipientName.split(' ').slice(1).join(' '));
    urlWithParams.searchParams.set('email', recipientEmail);
    urlWithParams.searchParams.set('role', role);
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Property Shared with You</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName},</h2>
            <p style="color: #666; line-height: 1.6;">
              ${senderName} has shared a property listing with you. You can access the property details, 
              documents, and make offers through the link below.
            </p>
            ${customMessage ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0; font-style: italic;">
                "${customMessage}"
              </p>
            </div>
            ` : ''}
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Role: ${roleText}
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${urlWithParams.toString()}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Property
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all;">
              ${urlWithParams.toString()}
            </p>
            <p style="color: #666; line-height: 1.6;">
              This link will take you directly to the property listing where you can view details, 
              documents, and make offers if interested.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Sharing email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email for buyer package created
  async sendBuyerPackageNotification(listingAgentEmail, listingAgentName, propertyAddress, buyerName, buyerRole) {
    const subject = `New Buyer Package Created - ${propertyAddress}`;
    const roleText = buyerRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: listingAgentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">New Buyer Package</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${listingAgentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              A new buyer package has been created for your property listing.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                ${buyerName} (${roleText})
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can view the buyer package and track their activity through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Buyer package notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email for property view
  async sendViewNotification(listingAgentEmail, listingAgentName, propertyAddress, viewerName, viewerRole) {
    const subject = `Property Viewed - ${propertyAddress}`;
    const roleText = viewerRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: listingAgentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Property Viewed</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${listingAgentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Someone has viewed your property listing.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Viewer: ${viewerName} (${roleText})
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can track all activity for this property through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('View notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email for document download
  async sendDownloadNotification(listingAgentEmail, listingAgentName, propertyAddress, downloaderName, downloaderRole, documentTitle) {
    const subject = `Document Downloaded - ${propertyAddress}`;
    const roleText = downloaderRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: listingAgentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Document Downloaded</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${listingAgentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Someone has downloaded a document from your property listing.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Document: ${documentTitle}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Downloaded by: ${downloaderName} (${roleText})
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can track all document activity for this property through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Download notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email for new offer
  async sendOfferNotification(listingAgentEmail, listingAgentName, propertyAddress, offerAmount, buyerName, buyerRole) {
    const subject = `New Offer Received - ${propertyAddress}`;
    const roleText = buyerRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: listingAgentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">New Offer Received</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${listingAgentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              A new offer has been submitted for your property listing.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Offer Amount: $${offerAmount?.toLocaleString() || 'N/A'}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                ${buyerName} (${roleText})
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can review and respond to this offer through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Offer notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email for agent added to listing
  async sendAgentAddedNotification(agentEmail, agentName, propertyAddress, addedByAgentName) {
    const subject = `You've been added as a listing agent - ${propertyAddress}`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: agentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Listing Agent Added</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${agentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              You have been added as a listing agent for a property on RealOffer.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Added by: ${addedByAgentName}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You now have access to manage this property listing, including viewing offers, 
              managing documents, and more.
            </p>
            <p style="color: #666; line-height: 1.6;">
              You can access this property through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Agent added notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer response notification email
  async sendOfferResponseNotification(agentEmail, agentName, propertyAddress, responseType, subject, message, responderName, offerAmount) {
    let responseTitle, responseColor;
    
    switch (responseType) {
      case 'acceptOffer':
        responseTitle = 'Offer Accepted';
        responseColor = '#28a745';
        break;
      case 'rejectOffer':
        responseTitle = 'Offer Rejected';
        responseColor = '#dc3545';
        break;
      case 'counterOffer':
        responseTitle = 'Counter Offer';
        responseColor = '#ffc107';
        break;
      case 'sendMessage':
      default:
        responseTitle = 'Offer Message Received';
        responseColor = '#007bff';
        break;
    }
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: agentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">${responseTitle}</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${agentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              You have received a response regarding your offer on RealOffer.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Offer Amount: $${offerAmount?.toLocaleString() || 'N/A'}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Responded by: ${responderName}
              </p>
            </div>
            <div style="background-color: ${responseColor}15; border-left: 4px solid ${responseColor}; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: ${responseColor}; font-weight: 600; margin: 0 0 10px 0; font-size: 16px;">
                ${responseTitle}
              </p>
            </div>
            ${message ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                ${message}
              </p>
            </div>
            ` : ''}
            <p style="color: #666; line-height: 1.6;">
              You can view the full details and continue the conversation through your RealOffer dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Offer response notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer due date reminder email
  async sendOfferDueDateReminder(recipientEmail, recipientName, propertyAddress, timeRemaining, dueDate, recipientRole) {
    const roleText = recipientRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    const formattedDueDate = new Date(dueDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: `Offer Due Date Reminder - ${propertyAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Offer Due Date Reminder</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName},</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a reminder that the offer due date for a property you're interested in is approaching.
            </p>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; font-weight: 600; margin: 0 0 10px 0; font-size: 16px;">
                ⏰ Time Remaining: ${timeRemaining}
              </p>
            </div>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Due Date: ${formattedDueDate}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              Make sure to submit your offer before the deadline. You can access the property listing and submit your offer through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Property
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to reach out to the listing agent.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              RealOffer - Making real estate transactions simple and secure.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Offer due date reminder send error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 