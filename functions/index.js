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
    console.log("✅ Released slots:", timeSlots);
  } catch (error) {
    console.error("❌ Error releasing slots:", error);
    throw error; // Re-throw to handle in calling function
  }
};

// Function to find booking by payment ID or order ID with retry logic
// Timing Strategy:
// - Option 1: Initial 2-second delay to allow frontend to create booking
// - Option 2: 5 retry attempts with 3-second gaps (total 15 seconds wait time)
// - Total maximum wait: 17 seconds (2s initial + 15s retries)
const findBookingByIds = async (paymentId, orderId) => {
  const bookingRef = admin.firestore().collection("bookings");

  // Option 1: Initial delay to allow frontend to create booking
  console.log("⏳ Initial delay: Waiting 2 seconds for frontend to create booking...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Option 2: Retry logic with 15 seconds total and 3-second gaps
  const maxRetries = 5; // 5 attempts with 3-second gaps = 15 seconds total
  const delayMs = 3000; // 3 seconds between attempts

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `🔍 Attempt ${attempt}/${maxRetries} to find booking (${
        attempt * delayMs + 2000
      }ms total wait time)...`
    );

    // Try to find by payment ID first
    if (paymentId) {
      let query = await bookingRef.where("paymentData.paymentId", "==", paymentId).get();
      if (!query.empty) {
        const bookingDoc = query.docs[0];
        const bookingData = bookingDoc.data();
        console.log(`✅ Booking found by payment ID on attempt ${attempt}:`, paymentId);
        return { bookingDoc, bookingData, searchMethod: "paymentId" };
      }
    }

    // Fallback: Try to find by order ID
    if (orderId) {
      let query = await bookingRef.where("paymentData.orderId", "==", orderId).get();
      if (!query.empty) {
        const bookingDoc = query.docs[0];
        const bookingData = bookingDoc.data();
        console.log(`✅ Booking found by order ID on attempt ${attempt}:`, orderId);
        return { bookingDoc, bookingData, searchMethod: "orderId" };
      }
    }

    // If this is not the last attempt, wait before retrying
    if (attempt < maxRetries) {
      console.log(
        `⏳ Booking not found on attempt ${attempt}, waiting ${delayMs}ms before retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(
    `❌ No booking found after ${maxRetries} attempts (${
      maxRetries * delayMs + 2000
    }ms total wait time) for payment ID:`,
    paymentId,
    "or order ID:",
    orderId
  );
  return null;
};

exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    console.log("🚀 Webhook received at:", new Date().toISOString());
    console.log("📡 Webhook event:", req.body?.event);
    console.log("📡 Payment ID:", req.body?.payload?.payment?.entity?.id);
    console.log("📡 Order ID:", req.body?.payload?.payment?.entity?.order_id);

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
      const orderId = payment.order_id; // Get order ID from payment
      console.log(
        "🎉 Payment captured:",
        payment.id,
        "Amount:",
        payment.amount,
        "Order ID:",
        orderId
      );

      try {
        console.log("⏱️ Starting booking search with retry logic (up to 17 seconds total)...");
        // Find booking using helper function with retry logic
        const bookingResult = await findBookingByIds(payment.id, orderId);

        if (bookingResult) {
          const { bookingDoc, bookingData, searchMethod } = bookingResult;

          // Update booking with payment success
          await bookingDoc.ref.update({
            "paymentData.status": "success",
            "paymentData.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
            "paymentData.webhookProcessed": true,
            "paymentData.paymentId": payment.id, // Update with latest payment ID
            "paymentData.orderId": orderId, // Ensure order ID is set
            bookingStatus: "confirmed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(
            `✅ Booking confirmed for ${searchMethod}:`,
            searchMethod === "paymentId" ? payment.id : orderId
          );
          console.log("✅ Booking status updated to 'confirmed'");

          return res.status(200).json({
            message: "Payment captured and booking confirmed",
            payment_id: payment.id,
            order_id: orderId,
            booking_id: bookingDoc.id,
            search_method: searchMethod,
          });
        } else {
          console.log("❌ No booking found for payment ID:", payment.id, "or order ID:", orderId);
          return res.status(404).json({
            error: "Booking not found",
            payment_id: payment.id,
            order_id: orderId,
          });
        }
      } catch (dbError) {
        console.error("❌ Database update error:", dbError);
        return res.status(500).json({ error: "Database update failed" });
      }
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id; // Get order ID from payment
      console.log(
        "❌ Payment failed:",
        payment.id,
        "Reason:",
        payment.error_reason,
        "Order ID:",
        orderId
      );

      try {
        // Find booking using helper function
        const bookingResult = await findBookingByIds(payment.id, orderId);

        if (bookingResult) {
          const { bookingDoc, bookingData, searchMethod } = bookingResult;
          console.log(
            `🗑️ Cleaning up failed booking found by ${searchMethod}:`,
            searchMethod === "paymentId" ? payment.id : orderId
          );

          // Release the booked slots
          await releaseBookedSlots(bookingData);
          console.log("✅ Slots released for failed payment");

          // Delete related flat bookings
          const flatBookingsRef = admin.firestore().collection("flatBookings");
          const flatQuery = await flatBookingsRef.where("bookingId", "==", bookingDoc.id).get();
          const batch = admin.firestore().batch();
          flatQuery.forEach((docSnap) => batch.delete(docSnap.ref));

          // Delete the main booking document
          batch.delete(bookingDoc.ref);
          await batch.commit();

          console.log("✅ Failed booking and related flat bookings deleted");
          console.log("✅ Slots freed up for new bookings");

          return res.status(200).json({
            message: "Payment failed. Booking and slots cleaned up.",
            payment_id: payment.id,
            order_id: orderId,
            booking_id: bookingDoc.id,
            search_method: searchMethod,
            slots_freed: bookingData.timeSlots?.length || 0,
          });
        } else {
          console.log(
            "❌ No booking found for failed payment ID:",
            payment.id,
            "or order ID:",
            orderId
          );
          return res.status(404).json({
            error: "Booking not found",
            payment_id: payment.id,
            order_id: orderId,
          });
        }
      } catch (dbError) {
        console.error("❌ Database cleanup error:", dbError);
        return res.status(500).json({ error: "Database cleanup failed" });
      }
    }

    // Handle payment.authorized event (payment initiated but not captured yet)
    if (event.event === "payment.authorized") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      console.log(
        "🔐 Payment authorized:",
        payment.id,
        "Order ID:",
        orderId,
        "Amount:",
        payment.amount
      );

      // Find and update booking status to show payment is processing
      try {
        const bookingResult = await findBookingByIds(payment.id, orderId);
        if (bookingResult) {
          const { bookingDoc, bookingData, searchMethod } = bookingResult;

          await bookingDoc.ref.update({
            "paymentData.status": "authorized",
            "paymentData.authorizedAt": admin.firestore.FieldValue.serverTimestamp(),
            "paymentData.webhookProcessed": true,
            "paymentData.paymentId": payment.id,
            "paymentData.orderId": orderId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Booking updated to authorized status via ${searchMethod}`);
        }
      } catch (dbError) {
        console.error("❌ Error updating authorized status:", dbError);
      }

      return res.status(200).json({ message: "Payment authorized webhook processed" });
    }

    // For other events, just acknowledge
    console.log("📝 Unhandled webhook event:", event.event);
    return res.status(200).json({ message: "Webhook received", event: event.event });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create Razorpay order with auto-capture
exports.createRazorpayOrder = functions.https.onRequest(async (req, res) => {
  try {
    console.log("🚀 createRazorpayOrder function called");
    console.log("📡 Request method:", req.method);
    console.log("📡 Request headers:", req.headers);
    console.log("📡 Request body:", req.body);

    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      console.log("✅ CORS preflight request handled");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      console.error("❌ Invalid method:", req.method);
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const keyId = functions.config().razorpay?.key_id || process.env.RAZORPAY_KEY_ID;
    const keySecret = functions.config().razorpay?.key_secret || process.env.RAZORPAY_KEY_SECRET;

    console.log("🔑 Razorpay credentials check:");
    console.log("🔑 Key ID exists:", !!keyId);
    console.log("🔑 Key Secret exists:", !!keySecret);

    if (!keyId || !keySecret) {
      console.error("❌ Missing Razorpay credentials");
      console.error("❌ Key ID:", keyId ? "SET" : "MISSING");
      console.error("❌ Key Secret:", keySecret ? "SET" : "MISSING");
      console.error("❌ Functions config:", functions.config().razorpay);
      console.error("❌ Environment vars:", {
        RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
      });
      return res.status(500).json({ error: "Server not configured for Razorpay" });
    }

    const { amount, currency = "INR", receipt, notes } = req.body || {};
    console.log("💰 Order parameters:");
    console.log("💰 Amount:", amount, "Type:", typeof amount);
    console.log("💰 Currency:", currency);
    console.log("💰 Receipt:", receipt);
    console.log("💰 Notes:", notes);

    if (!amount || typeof amount !== "number") {
      console.error("❌ Invalid amount:", amount, "Type:", typeof amount);
      return res.status(400).json({ error: "Invalid amount" });
    }

    console.log("🔧 Initializing Razorpay instance...");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const orderParams = {
      amount: Math.round(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: notes || {},
    };

    console.log("📋 Creating Razorpay order with params:", orderParams);

    const order = await razorpay.orders.create(orderParams);

    console.log("✅ Razorpay order created successfully:");
    console.log("✅ Order ID:", order.id);
    console.log("✅ Order amount:", order.amount);
    console.log("✅ Order currency:", order.currency);
    console.log("✅ Order status:", order.status);
    console.log("✅ Payment capture:", orderParams.payment_capture);

    return res.status(200).json({ order });
  } catch (error) {
    console.error("💥 Error creating Razorpay order:", error);
    console.error("💥 Error name:", error.name);
    console.error("💥 Error message:", error.message);
    console.error("💥 Error stack:", error.stack);

    // Check if it's a Razorpay API error
    if (error.error) {
      console.error("💥 Razorpay API error details:", error.error);
    }

    return res.status(500).json({
      error: "Failed to create order",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Simple endpoint to check webhook status
exports.webhookStatus = functions.https.onRequest((req, res) => {
  res.status(200).json({
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint for createRazorpayOrder function
exports.testCreateOrder = functions.https.onRequest(async (req, res) => {
  try {
    console.log("🧪 Test endpoint called");

    // Set CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const keyId = functions.config().razorpay?.key_id || process.env.RAZORPAY_KEY_ID;
    const keySecret = functions.config().razorpay?.key_secret || process.env.RAZORPAY_KEY_SECRET;

    return res.status(200).json({
      message: "Test endpoint is working",
      timestamp: new Date().toISOString(),
      function: "testCreateOrder",
      razorpayConfigured: !!(keyId && keySecret),
      keyIdExists: !!keyId,
      keySecretExists: !!keySecret,
      configKeys: Object.keys(functions.config().razorpay || {}),
      envVars: {
        RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
      },
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return res.status(500).json({ error: "Test failed", details: error.message });
  }
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
