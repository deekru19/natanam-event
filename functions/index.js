const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cryptoLib = require("crypto");

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

          // Update booking with payment failure
          await bookingDoc.ref.update({
            "paymentData.status": "failed",
            "paymentData.failedAt": admin.firestore.FieldValue.serverTimestamp(),
            "paymentData.webhookProcessed": true,
            "paymentData.errorReason": payment.error_reason || "Payment failed",
            bookingStatus: "cancelled",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Booking cancelled for failed payment:", payment.id);

          return res.status(200).json({
            message: "Payment failure recorded and booking cancelled",
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

// Simple endpoint to check webhook status
exports.webhookStatus = functions.https.onRequest((req, res) => {
  res.status(200).json({
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
});
