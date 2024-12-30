import {
  createWelcomeEmailTemplate,
  createCommentNotificationEmailTemplate,
  createConnectionAcceptedEmailTemplate,
} from "./emailTemplate.js";
import { transporter } from "./nodemailerConfig.js";

export const sendWelcomeEmail = async (email, name, profileUrl) => {
  try {
    // Validate inputs
    if (!email || !name || !profileUrl) {
      throw new Error(
        "Missing required parameters: email, name, or profileUrl"
      );
    }

    const mailOptions = {
      from: `"LinkedIn" <no-reply@linkedin.com>`, // Sender address
      to: email, // Recipient address
      subject: "Welcome to Signup", // Email subject
      html: createWelcomeEmailTemplate(name, profileUrl), // HTML body
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log(
      `Welcome Email sent successfully to ${email}. Message ID: ${info.messageId}`
    );

    // Return success response
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send Welcome Email to ${email}:`, error.message);

    // Return failure response
    return { success: false, error: error.message };
  }
};

export const sendCommentNotificationEmail = async (
  recipientEmail,
  recipientName,
  commenterName,
  postUrl,
  commentContent
) => {
  try {
    // Ensure required parameters are provided
    if (
      !recipientEmail ||
      !recipientName ||
      !commenterName ||
      !postUrl ||
      !commentContent
    ) {
      throw new Error("Missing required parameters for sending email");
    }

    const mailOptions = {
      from: `"LinkedIn" <no-reply@linkedin.com>`, // Sender address
      to: recipientEmail, // Recipient email
      subject: "New comment on your post", // Email subject
      html: createCommentNotificationEmailTemplate(
        recipientName,
        commenterName,
        postUrl,
        commentContent
      ), // HTML body content
    };

    const info = await transporter.sendMail(mailOptions); // Send the email
    console.log(
      `Notification Email sent successfully to ${recipientEmail}. Message ID: ${info.messageId}`
    );

    // Return success status
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `Failed to send Comment Notification Email to ${recipientEmail}:`,
      error.message
    );

    // Return failure status
    return { success: false, error: error.message };
  }
};

export const sendConnectionAcceptedEmail = async (
  senderEmail,
  senderName,
  recipientName,
  profileUrl
) => {
  
  try {
    // Ensure required parameters are provided
    if (!senderEmail || !senderName || !recipientName || !profileUrl) {
      throw new Error("Missing required parameters for sending email");
    }

    const mailOptions = {
      from: `"LinkedIn" <no-reply@linkedin.com>`, // Sender address
      to: senderEmail, // Recipient email
      subject: `${recipientName} accepted your connection request`, // Email subject
      html: createConnectionAcceptedEmailTemplate(senderName, recipientName, profileUrl), // HTML body content
    };

    const info = await transporter.sendMail(mailOptions); // Send the email
    console.log(
      `Connection request accepted Email sent successfully to ${senderEmail}. Message ID: ${info.messageId}`
    );

    // Return success status
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `Failed to send Connection request accepted Email to ${recipientEmail}:`,
      error.message
    );

    // Return failure status
    return { success: false, error: error.message };
  }
};
