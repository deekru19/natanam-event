// WhatsApp messaging service using Facebook Cloud API
import { FlatBooking } from "./firebaseService";

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text: {
    body: string;
  };
}

class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string = "v21.0";
  private readonly baseUrl: string;

  constructor() {
    this.accessToken = process.env.REACT_APP_FACEBOOK_ACCESS_TOKEN || "";
    this.phoneNumberId = process.env.REACT_APP_FACEBOOK_PHONE_NUMBER_ID || "";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.phoneNumberId) {
      console.error("Facebook WhatsApp credentials not found in environment variables");
    }
  }

  /**
   * Replace placeholders in message template with booking data
   */
  private replacePlaceholders(template: string, booking: FlatBooking): string {
    let message = template;

    // Define placeholder mappings
    const placeholders: { [key: string]: string } = {
      "{name}":
        booking.participantName ||
        booking.fullName ||
        booking.participant1Name ||
        booking.groupName ||
        "N/A",
      "{email}": booking.email || "N/A",
      "{phone}":
        booking.phoneNumber || booking.participant1Phone || booking.representativePhone || "N/A",
      "{booking_id}": booking.bookingId || "N/A",
      "{event_name}": "Natanam Dance Event",
      "{event_date}": booking.date || "N/A",
      "{event_time}": booking.timeSlot || "N/A",
      "{performance_type}": booking.performanceTypeName || booking.performanceType || "N/A",
      "{city}": booking.cityResidence || "N/A",
      "{guru_name}": booking.guruName || "N/A",
      "{category}": booking.performanceCategory || "N/A",
      "{price}": booking.pricePerPerson?.toString() || "N/A",
      "{amount}": booking.amountPerSlot?.toString() || "N/A",
      "{created_at}": booking.timestamp
        ? new Date(booking.timestamp.toDate()).toLocaleDateString()
        : "N/A",
      "{participant_age}": booking.participantAge || "N/A",
      "{participant1_name}": booking.participant1Name || "N/A",
      "{participant2_name}": booking.participant2Name || "N/A",
      "{participant1_phone}": booking.participant1Phone || "N/A",
      "{participant2_phone}": booking.participant2Phone || "N/A",
      "{group_name}": booking.groupName || "N/A",
      "{member_names}": booking.memberNames || "N/A",
      "{representative_phone}": booking.representativePhone || "N/A",
      "{payment_id}": booking.paymentId || "N/A",
      "{status}": booking.paymentStatus || "N/A",
    };

    // Replace all placeholders
    Object.keys(placeholders).forEach((placeholder) => {
      message = message.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        placeholders[placeholder]
      );
    });

    return message;
  }

  /**
   * Get phone number for messaging from booking data
   */
  private getPhoneNumber(booking: FlatBooking): string | null {
    // Try different phone number fields based on performance type
    const phoneNumber =
      booking.phoneNumber || booking.participant1Phone || booking.representativePhone;

    if (!phoneNumber) {
      return null;
    }

    // Clean and format phone number (remove spaces, dashes, etc.)
    let cleanPhone = phoneNumber.replace(/\D/g, "");

    // Add country code if not present (assuming India +91)
    if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Send a single WhatsApp message
   */
  private async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const messageData: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: message,
        },
      };

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("WhatsApp API error:", errorData);
        return false;
      }

      const result = await response.json();
      console.log("Message sent successfully:", result);
      return true;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  /**
   * Send batch messages to all bookings
   */
  async sendBatchMessages(
    messageTemplate: string,
    bookings: FlatBooking[],
    onProgress?: (sent: number, total: number, success: number, failed: number) => void
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ booking: FlatBooking; success: boolean; error?: string }>;
  }> {
    const results: Array<{ booking: FlatBooking; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];

      try {
        // Get phone number
        const phoneNumber = this.getPhoneNumber(booking);

        if (!phoneNumber) {
          results.push({
            booking,
            success: false,
            error: "No valid phone number found",
          });
          failedCount++;
          continue;
        }

        // Replace placeholders in message
        const personalizedMessage = this.replacePlaceholders(messageTemplate, booking);

        // Send message
        const success = await this.sendMessage(phoneNumber, personalizedMessage);

        results.push({
          booking,
          success,
          error: success ? undefined : "Failed to send message",
        });

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Call progress callback
        if (onProgress) {
          onProgress(i + 1, bookings.length, successCount, failedCount);
        }

        // Add small delay between messages to avoid rate limiting
        if (i < bookings.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        results.push({
          booking,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Get available placeholders for the UI
   */
  getAvailablePlaceholders(): string[] {
    return [
      "{name}",
      "{email}",
      "{phone}",
      "{booking_id}",
      "{event_name}",
      "{event_date}",
      "{event_time}",
      "{performance_type}",
      "{city}",
      "{guru_name}",
      "{category}",
      "{price}",
      "{amount}",
      "{created_at}",
      "{participant_age}",
      "{participant1_name}",
      "{participant2_name}",
      "{participant1_phone}",
      "{participant2_phone}",
      "{group_name}",
      "{member_names}",
      "{representative_phone}",
      "{payment_id}",
      "{status}",
    ];
  }

  /**
   * Preview message for a sample booking
   */
  previewMessage(template: string, sampleBooking: FlatBooking): string {
    return this.replacePlaceholders(template, sampleBooking);
  }
}

export const whatsAppService = new WhatsAppService();
export default WhatsAppService;
