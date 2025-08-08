const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const cryptoLib = require("crypto");
const Razorpay = require("razorpay");

admin.initializeApp();

// Function to verify Razorpay webhook signature
const verifyWebhookSignature = (body, signature, secret) => {
  try {
    const expectedSignature = cryptoLib.createHmac("sha256", secret).update(body).digest("hex");
    return cryptoLib.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

// Function to release booked slots
const releaseBookedSlots = async (booking) => {
  try {
    const { date, timeSlots } = booking;
    const slotsRef = admin.firestore().doc(`slots/${date}`);

    // Update each slot back to available
    const updates = {};
    timeSlots.forEach((slot) => {
      updates[slot] = "available";
    });

    await slotsRef.update(updates);
    console.log("Released slots:", timeSlots);
  } catch (error) {
    console.error("Error releasing slots:", error);
  }
};

exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-razorpay-signature");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = functions.config().razorpay?.webhook_secret || "your_webhook_secret";

    if (!signature) {
      console.error("No signature provided");
      return res.status(400).json({ error: "No signature provided" });
    }

    const body = JSON.stringify(req.body);
    const isValidSignature = verifyWebhookSignature(body, signature, webhookSecret);

    if (!isValidSignature) {
      console.error("Invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;
    console.log(
      "Received webhook:",
      event.event,
      "for payment:",
      event.payload?.payment?.entity?.id
    );

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      console.log("Payment captured:", payment.id, "Amount:", payment.amount);

      try {
        // Find booking by payment ID
        const bookingRef = admin.firestore().collection("bookings");
        const query = await bookingRef.where("paymentData.paymentId", "==", payment.id).get();

        if (!query.empty) {
          const bookingDoc = query.docs[0];
          const bookingData = bookingDoc.data();

          // Update booking with payment success
          await bookingDoc.ref.update({
            "paymentData.status": "success",
            "paymentData.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
            "paymentData.webhookProcessed": true,
            bookingStatus: "confirmed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Booking confirmed for payment:", payment.id);

          return res.status(200).json({
            message: "Payment captured and booking confirmed",
            payment_id: payment.id,
            booking_id: bookingDoc.id,
          });
        } else {
          console.log("No booking found for payment ID:", payment.id);
          return res.status(404).json({
            error: "Booking not found",
            payment_id: payment.id,
          });
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
        return res.status(500).json({ error: "Database update failed" });
      }
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      console.log("Payment failed:", payment.id, "Reason:", payment.error_reason);

      try {
        // Find booking by payment ID
        const bookingRef = admin.firestore().collection("bookings");
        const query = await bookingRef.where("paymentData.paymentId", "==", payment.id).get();

        if (!query.empty) {
          const bookingDoc = query.docs[0];
          const bookingData = bookingDoc.data();

          // Release the booked slots
          await releaseBookedSlots(bookingData);

          // Delete related flat bookings
          const flatBookingsRef = admin.firestore().collection("flatBookings");
          const flatQuery = await flatBookingsRef.where("bookingId", "==", bookingDoc.id).get();
          const batch = admin.firestore().batch();
          flatQuery.forEach((docSnap) => batch.delete(docSnap.ref));
          // Delete the main booking document
          batch.delete(bookingDoc.ref);
          await batch.commit();

          console.log(
            "Pending booking and related flat bookings deleted for failed payment:",
            payment.id
          );

          return res.status(200).json({
            message: "Payment failed. Booking and slots cleaned up.",
            payment_id: payment.id,
            booking_id: bookingDoc.id,
          });
        } else {
          console.log("No booking found for failed payment ID:", payment.id);
          return res.status(404).json({
            error: "Booking not found",
            payment_id: payment.id,
          });
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
        return res.status(500).json({ error: "Database update failed" });
      }
    }

    // For other events, just acknowledge
    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create Razorpay order with auto-capture
exports.createRazorpayOrder = functions.https.onRequest(async (req, res) => {
  try {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const keyId = functions.config().razorpay?.key_id || process.env.RAZORPAY_KEY_ID;
    const keySecret = functions.config().razorpay?.key_secret || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error("Missing Razorpay credentials");
      return res.status(500).json({ error: "Server not configured for Razorpay" });
    }

    const { amount, currency = "INR", receipt, notes } = req.body || {};
    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: notes || {},
    });

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

// Simple endpoint to check webhook status
exports.webhookStatus = functions.https.onRequest((req, res) => {
  res.status(200).json({
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
});

// Scheduled cleanup for stuck pending bookings (webhook missed / user abandoned) - Gen 2
exports.cleanupExpiredBookings = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Etc/UTC",
    region: "us-central1",
  },
  async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const thresholdMinutes = 5; // consider pending beyond 5 minutes as expired
      const cutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - thresholdMinutes * 60 * 1000
      );

      const bookingsRef = admin.firestore().collection("bookings");
      const pendingSnapshot = await bookingsRef.where("bookingStatus", "==", "pending").get();

      if (pendingSnapshot.empty) {
        return null;
      }

      for (const docSnap of pendingSnapshot.docs) {
        const booking = docSnap.data();
        const createdAt = booking.timestamp;

        if (!createdAt || createdAt.toMillis() > cutoff.toMillis()) {
          continue;
        }

        if (booking.bookingStatus === "confirmed" || booking.paymentData?.status === "success") {
          continue;
        }

        await releaseBookedSlots(booking);

        const batch = admin.firestore().batch();
        const flatRef = admin.firestore().collection("flatBookings");
        const flats = await flatRef.where("bookingId", "==", docSnap.id).get();
        flats.forEach((f) => batch.delete(f.ref));
        batch.delete(docSnap.ref);
        await batch.commit();

        console.log(
          `Cleaned up expired pending booking ${docSnap.id} (older than ${thresholdMinutes} min)`
        );
      }

      return null;
    } catch (error) {
      console.error("cleanupExpiredBookings error:", error);
      return null;
    }
  }
);
