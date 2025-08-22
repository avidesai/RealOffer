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
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Activity
              </a>
            </div>
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
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Activity
              </a>
            </div>
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
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Activity
              </a>
            </div>
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

  // Send notification email for bulk document downloads
  async sendBulkDownloadNotification(listingAgentEmail, listingAgentName, propertyAddress, downloaderName, downloaderRole, documentTitles, documentCount) {
    const subject = `Multiple Documents Downloaded - ${propertyAddress}`;
    const roleText = downloaderRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    // Create a list of documents (limit to first 10 to avoid overly long emails)
    const displayTitles = documentTitles.slice(0, 10);
    const remainingCount = documentTitles.length - 10;
    
    const documentsList = displayTitles.map(title => `<li style="color: #666; margin: 5px 0;">${title}</li>`).join('');
    const remainingText = remainingCount > 0 ? `<li style="color: #666; margin: 5px 0; font-style: italic;">... and ${remainingCount} more documents</li>` : '';
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: listingAgentEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Multiple Documents Downloaded</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${listingAgentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Someone has downloaded multiple documents from your property listing.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Documents Downloaded: ${documentCount}
              </p>
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
                Downloaded by: ${downloaderName} (${roleText})
              </p>
              <div style="margin-top: 10px;">
                <p style="color: #666; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">Documents:</p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${documentsList}
                  ${remainingText}
                </ul>
              </div>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can track all document activity for this property through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Activity
              </a>
            </div>
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
      console.error('Bulk download notification send error:', error);
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
                Offer Amount: $${Number(offerAmount)?.toLocaleString() || 'N/A'}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                ${buyerName} (${roleText})
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can review and respond to this offer through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Offer
              </a>
            </div>
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

  // Send team member added notification email
  async sendTeamMemberAddedNotification(teamMemberEmail, teamMemberName, propertyAddress, addedByAgentName) {
    const subject = `You've been added as a team member - ${propertyAddress}`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: teamMemberEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Team Member Added</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${teamMemberName},</h2>
            <p style="color: #666; line-height: 1.6;">
              You have been added as a team member for a property on RealOffer.
            </p>
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #2e7d32; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Added by: ${addedByAgentName}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You now have full access to manage this property listing, including viewing offers, 
              managing documents, and responding to buyer inquiries. Your profile will remain private 
              and won't be displayed to buyers or other external parties.
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
      console.error('Team member added notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer under review notification email
  async sendOfferUnderReviewNotification(agentEmail, agentName, propertyAddress, offerAmount, listingAgentName) {
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: agentEmail,
      subject: `Your Offer Is Being Reviewed - ${propertyAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Offer Under Review</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${agentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Great news! Your offer has been viewed and is now under consideration.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Offer Amount: $${Number(offerAmount)?.toLocaleString() || 'N/A'}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Reviewed by: ${listingAgentName}
              </p>
            </div>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; font-weight: 600; margin: 0 0 10px 0; font-size: 16px;">
                Status: Under Review
              </p>
              <p style="color: #856404; margin: 0; line-height: 1.6;">
                The listing agent has viewed your offer and is now considering it. You'll be notified when they respond.
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can view the full details and any updates through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Offer
              </a>
            </div>
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
      console.error('Offer under review notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send new message notification email
  async sendNewMessageNotification(recipientEmail, recipientName, senderName, propertyAddress, messageContent, offerAmount, messageId) {
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: `New Offer Message - ${propertyAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">New Message</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName},</h2>
            <p style="color: #666; line-height: 1.6;">
              You have received a new message regarding an offer on RealOffer.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Offer Amount: $${Number(offerAmount)?.toLocaleString() || 'N/A'}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                From: ${senderName}
              </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                ${messageContent}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You can view the full conversation and respond through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Message
              </a>
            </div>
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
      console.error('New message notification send error:', error);
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
                Offer Amount: $${Number(offerAmount)?.toLocaleString() || 'N/A'}
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
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Response
              </a>
            </div>
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
  async sendOfferDueDateReminder(recipientEmail, recipientName, propertyAddress, timeRemaining, dueDate, recipientRole, timezone = 'America/Los_Angeles') {
    const roleText = recipientRole === 'agent' ? 'Buyer Agent' : 'Buyer';
    
    // Format the date using the stored timezone
    const formattedDueDate = new Date(dueDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: `Offers Due in ${timeRemaining} - ${propertyAddress}`,
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
                ⏰ Time Remaining: ${timeRemaining === '1 day' ? '24 hours' : timeRemaining}
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

  // Send team member invitation email
  async sendTeamMemberInvitation(recipientEmail, recipientFirstName, recipientLastName, inviterName, propertyAddress, invitationToken, listingId, customMessage = '') {
    console.log('Sending team member invitation email:', {
      recipientEmail,
      recipientFirstName,
      recipientLastName,
      inviterName,
      propertyAddress,
      invitationToken,
      listingId,
      customMessage
    });
    
    const pflUrl = `${process.env.FRONTEND_URL}/listings/public/${invitationToken}?email=${encodeURIComponent(recipientEmail)}&role=teamMember&firstName=${encodeURIComponent(recipientFirstName || '')}&lastName=${encodeURIComponent(recipientLastName || '')}`;
    
    console.log('Generated PFL URL:', pflUrl);
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: `${inviterName} invited you to join their team on RealOffer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">You're Invited!</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientFirstName || 'there'},</h2>
            <p style="color: #666; line-height: 1.6;">
              ${inviterName} has invited you to join their team to manage a property listing.
            </p>
            ${customMessage ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0; font-style: italic;">
                "${customMessage}"
              </p>
            </div>
            ` : ''}
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Property Details</h3>
              <p style="color: #666; margin: 0;">${propertyAddress}</p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              As a team member, you'll have access to manage this listing and collaborate with the listing agents.
              Team members are not displayed to buyers or other external parties.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${pflUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Join Team
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all;">
              ${pflUrl}
            </p>
            <p style="color: #666; line-height: 1.6;">
              This invitation link will expire in 7 days. If you have any questions, please contact ${inviterName}.
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
      console.log('Attempting to send email to:', recipientEmail);
      await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', recipientEmail);
      return { success: true };
    } catch (error) {
      console.error('Team member invitation send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send listing agent invitation email
  async sendListingAgentInvitation(recipientEmail, recipientFirstName, recipientLastName, inviterName, propertyAddress, invitationToken, listingId, customMessage = '') {
    console.log('Sending listing agent invitation email:', {
      recipientEmail,
      recipientFirstName,
      recipientLastName,
      inviterName,
      propertyAddress,
      invitationToken,
      listingId,
      customMessage
    });
    
    const pflUrl = `${process.env.FRONTEND_URL}/listings/public/${invitationToken}?email=${encodeURIComponent(recipientEmail)}&role=listingAgent&firstName=${encodeURIComponent(recipientFirstName || '')}&lastName=${encodeURIComponent(recipientLastName || '')}`;
    
    console.log('Generated PFL URL:', pflUrl);
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: recipientEmail,
      subject: `${inviterName} invited you to be a listing agent on RealOffer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">You're Invited!</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientFirstName || 'there'},</h2>
            <p style="color: #666; line-height: 1.6;">
              ${inviterName} has invited you to be a listing agent for a property on RealOffer.
            </p>
            ${customMessage ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0; font-style: italic;">
                "${customMessage}"
              </p>
            </div>
            ` : ''}
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Property Details</h3>
              <p style="color: #666; margin: 0;">${propertyAddress}</p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              As a listing agent, you'll have full access to manage this property listing, including receiving offers, 
              managing documents, and responding to buyer inquiries. Your profile will be displayed to buyers 
              and other external parties as a listing agent.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${pflUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Join as Listing Agent
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all;">
              ${pflUrl}
            </p>
            <p style="color: #666; line-height: 1.6;">
              This invitation link will expire in 7 days. If you have any questions, please contact ${inviterName}.
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
      console.log('Attempting to send email to:', recipientEmail);
      await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', recipientEmail);
      return { success: true };
    } catch (error) {
      console.error('Listing agent invitation send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send listing agent added notification email
  async sendListingAgentAddedNotification(agentEmail, agentName, propertyAddress, addedByAgentName) {
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
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #2e7d32; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Added by: ${addedByAgentName}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You now have full access to manage this property listing, including receiving offers, 
              managing documents, and responding to buyer inquiries. Your profile will be displayed 
              to buyers and other external parties as a listing agent.
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
      console.error('Listing agent added notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer submission confirmation email to offer creator
  async sendOfferSubmissionConfirmation(offerCreatorEmail, offerCreatorName, propertyAddress, offerAmount, offerId) {
    const subject = `Your offer has been submitted - ${propertyAddress}`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: offerCreatorEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Offer Submitted Successfully!</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${offerCreatorName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Your offer has been successfully submitted and for review by the listing agent.
            </p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-weight: 600; margin: 0 0 10px 0;">
                ${propertyAddress}
              </p>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                Offer Amount: $${Number(offerAmount)?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You will be notified when the listing agent responds to your offer. You can also track the status of your offer through your RealOffer dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Track Offer
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If you have any questions about your offer, please contact the listing agent directly.
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
      console.error('Offer submission confirmation send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email to agents
  async sendAgentWelcomeEmail(agentEmail, agentName) {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: agentEmail,
      subject: 'Welcome to RealOffer - Your Real Estate Success Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Welcome to RealOffer!</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Your complete real estate transaction platform</p>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${agentName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Welcome to RealOffer! We're excited to help you streamline your real estate transactions and provide your clients with a modern, professional experience.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">🚀 What you can do with RealOffer:</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                <li><strong>Create Professional Listings:</strong> Build beautiful property packages with photos, documents, and detailed information</li>
                <li><strong>AI-Powered Comps Analysis:</strong> Get instant comparable property analysis to help price your listings competitively</li>
                <li><strong>AI Disclosure Summaries:</strong> Automatically generate clear, concise summaries of complex disclosure documents</li>
                <li><strong>AI Chat Assistant:</strong> Provide instant answers to buyer questions about your properties</li>
                <li><strong>Manage Offers:</strong> Receive and review offers directly through the platform</li>
                <li><strong>Track Activity & Analytics:</strong> Monitor views, downloads, and buyer engagement with detailed insights</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Get Started Now
              </a>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #0056b3; margin: 0 0 10px 0;">💡 Quick Start Tips:</h4>
              <ul style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Create your first listing package in just a few minutes</li>
                <li>Upload property photos and documents to make your listing stand out</li>
                <li>Use AI-powered comps analysis to price your listings competitively</li>
                <li>Generate AI summaries of disclosure documents to help buyers understand key points</li>
                <li>Enable AI chat on your listings to answer buyer questions instantly</li>
                <li>Share your listing link with potential buyers and their agents</li>
                <li>Monitor activity and engagement through your dashboard</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any questions or need help getting started, don't hesitate to reach out to our support team.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Need Help?</h4>
              <p style="color: #666; line-height: 1.6; margin: 0;">
                <strong>Avi Desai</strong><br>
                Founder of RealOffer<br>
                <a href="mailto:avi@realoffer.io" style="color: #007bff; text-decoration: none;">avi@realoffer.io</a><br>
                <a href="tel:+14086019407" style="color: #007bff; text-decoration: none;">(408) 601-9407</a>
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Welcome aboard!<br>
              The RealOffer Team
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
      console.error('Agent welcome email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send trial expiration email
  async sendTrialExpirationEmail(userEmail, firstName) {
    const upgradeUrl = `${process.env.FRONTEND_URL}/upgrade-to-pro`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: userEmail,
      subject: 'Your RealOffer trial has ended - Upgrade to continue',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trial Period Ended</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Upgrade to continue enjoying RealOffer's premium features</p>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Your 3-month RealOffer trial period has ended. We hope you've enjoyed experiencing our premium features and found value in our platform.
            </p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin: 0 0 15px 0;">What happens now?</h3>
              <ul style="color: #856404; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li>You can still access your existing listings and data</li>
                <li>Premium features are now limited to free tier restrictions</li>
                <li>Upgrade anytime to restore full access to all features</li>
              </ul>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">🚀 Premium Features You'll Get:</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                <li><strong>Unlimited Listings:</strong> Create as many property packages as you need</li>
                <li><strong>Advanced AI Analysis:</strong> Get detailed property comparisons and market insights</li>
                <li><strong>AI Document Summaries:</strong> Automatically generate clear summaries of complex documents</li>
                <li><strong>AI Chat Assistant:</strong> Provide instant answers to buyer questions</li>
                <li><strong>Priority Support:</strong> Get faster response times from our support team</li>
                <li><strong>Advanced Analytics:</strong> Detailed insights into buyer engagement and activity</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${upgradeUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Upgrade to Pro
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any questions about upgrading or need assistance, please don't hesitate to reach out to our support team.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Need Help?</h4>
              <p style="color: #666; line-height: 1.6; margin: 0;">
                <strong>Avi Desai</strong><br>
                Founder of RealOffer<br>
                <a href="mailto:avi@realoffer.io" style="color: #007bff; text-decoration: none;">avi@realoffer.io</a><br>
                <a href="tel:+14086019407" style="color: #007bff; text-decoration: none;">(408) 601-9407</a>
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for trying RealOffer!<br>
              The RealOffer Team
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
      console.error('Trial expiration email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send trial expiration reminder
  async sendTrialExpirationReminder(userEmail, firstName, timeRemaining) {
    const upgradeUrl = `${process.env.FRONTEND_URL}/upgrade-to-pro`;
    
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: userEmail,
      subject: `Your RealOffer trial ends in ${timeRemaining} - Don't lose access!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trial Ending Soon</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Your trial ends in ${timeRemaining} - Upgrade now to keep all features</p>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Your RealOffer trial period will end in ${timeRemaining}. We don't want you to lose access to the premium features you've been enjoying!
            </p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin: 0 0 15px 0;">⏰ Time is running out!</h3>
              <p style="color: #856404; line-height: 1.6; margin: 0;">
                When your trial ends, you'll lose access to unlimited listings, AI analysis, and other premium features. 
                Upgrade now to continue enjoying everything RealOffer has to offer.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">🚀 What you'll keep with Pro:</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                <li><strong>Unlimited Listings:</strong> Create as many property packages as you need</li>
                <li><strong>AI-Powered Analysis:</strong> Get instant property comparisons and market insights</li>
                <li><strong>AI Document Summaries:</strong> Automatically generate clear summaries of complex documents</li>
                <li><strong>AI Chat Assistant:</strong> Provide instant answers to buyer questions</li>
                <li><strong>Advanced Analytics:</strong> Detailed insights into buyer engagement</li>
                <li><strong>Priority Support:</strong> Faster response times from our team</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${upgradeUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Upgrade Now
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Upgrade today to ensure uninterrupted access to all RealOffer features. 
              If you have any questions, our support team is here to help!
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Questions?</h4>
              <p style="color: #666; line-height: 1.6; margin: 0;">
                <strong>Avi Desai</strong><br>
                Founder of RealOffer<br>
                <a href="mailto:avi@realoffer.io" style="color: #007bff; text-decoration: none;">avi@realoffer.io</a><br>
                <a href="tel:+14086019407" style="color: #007bff; text-decoration: none;">(408) 601-9407</a>
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Don't let your trial expire!<br>
              The RealOffer Team
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
      console.error('Trial expiration reminder send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send seller activity notification
  async sendSellerActivityNotification(sellerEmail, sellerName, activityData) {
    const mailOptions = {
      from: `"RealOffer" <noreply@realoffer.io>`,
      to: sellerEmail,
      subject: `Property Activity Update - ${activityData.propertyAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Property Activity Report</h1>
            <p style="color: #666; margin: 10px 0 0 0;">${activityData.propertyAddress}</p>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Hi ${sellerName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Here's your ${activityData.period} activity report for your property. 
              ${activityData.agentName} is working hard to market your property effectively.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin: 0 0 20px 0; text-align: center;">📊 Activity Summary</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px;">
                    ${activityData.stats.buyerParties.current}
                  </div>
                  <div style="font-size: 14px; color: #666;">Buyer Parties</div>
                  <div style="font-size: 12px; color: ${activityData.stats.buyerParties.change.startsWith('+') ? '#28a745' : activityData.stats.buyerParties.change.startsWith('-') ? '#dc3545' : '#666'}; margin-top: 5px;">
                    ${activityData.stats.buyerParties.change}
                  </div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px;">
                    ${activityData.stats.views.current}
                  </div>
                  <div style="font-size: 14px; color: #666;">Property Views</div>
                  <div style="font-size: 12px; color: ${activityData.stats.views.change.startsWith('+') ? '#28a745' : activityData.stats.views.change.startsWith('-') ? '#dc3545' : '#666'}; margin-top: 5px;">
                    ${activityData.stats.views.change}
                  </div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px;">
                    ${activityData.stats.downloads.current}
                  </div>
                  <div style="font-size: 14px; color: #666;">Document Downloads</div>
                  <div style="font-size: 12px; color: ${activityData.stats.downloads.change.startsWith('+') ? '#28a745' : activityData.stats.downloads.change.startsWith('-') ? '#dc3545' : '#666'}; margin-top: 5px;">
                    ${activityData.stats.downloads.change}
                  </div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px;">
                    ${activityData.stats.offers.current}
                  </div>
                  <div style="font-size: 14px; color: #666;">Offers Received</div>
                  <div style="font-size: 12px; color: ${activityData.stats.offers.change.startsWith('+') ? '#28a745' : activityData.stats.offers.change.startsWith('-') ? '#dc3545' : '#666'}; margin-top: 5px;">
                    ${activityData.stats.offers.change}
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${activityData.listingUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 25px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Property Listing
                </a>
              </div>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
              <h4 style="color: #0056b3; margin: 0 0 10px 0;">💡 What This Means</h4>
              <p style="color: #0056b3; line-height: 1.6; margin: 0;">
                <strong>Buyer Parties:</strong> Number of potential buyers who have shown interest<br>
                <strong>Property Views:</strong> How many times your listing has been viewed<br>
                <strong>Document Downloads:</strong> Buyers downloading property information<br>
                <strong>Offers Received:</strong> Formal offers submitted by interested buyers
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              ${activityData.agentName} is actively marketing your property and will keep you updated on any significant developments. 
              If you have any questions about the market activity, please don't hesitate to reach out.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated report from RealOffer. You can manage your notification preferences in your listing settings.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Seller activity notification send error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 