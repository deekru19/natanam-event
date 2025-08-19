import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { TimeSlot } from "../utils/timeUtils";
import { eventConfig } from "../config/eventConfig";
import { getPriceForSlot } from "../utils/timeUtils";

// Flat booking structure for easy CSV export
export interface FlatBooking {
  id?: string;
  bookingId: string;
  date: string;
  timeSlot: string; // Individual time slot
  performanceType: string;
  performanceTypeName: string;
  pricePerPerson: number;
  participantName: string;
  // Solo fields
  participantAge?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  // Duet fields
  participant1Name?: string;
  participant2Name?: string;
  participant1Phone?: string;
  participant2Phone?: string;
  // Group fields
  groupName?: string;
  memberNames?: string;
  representativePhone?: string;
  // Common fields
  cityResidence?: string;
  rulesRead?: string;
  guruName?: string;
  performanceCategory?: string;
  danceStyle: string;
  screenshotUrl?: string;
  timestamp?: any;
  totalSlots: number;
  amountPerSlot: number;
  // Payment details
  paymentId?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  // Booking status
  bookingStatus?: "pending" | "confirmed" | "cancelled";
  // Original booking data for webhook processing
  originalBookingData?: any;
}

export interface Booking {
  id?: string;
  date: string;
  timeSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  screenshotUrl?: string;
  paymentData?: {
    paymentId: string;
    orderId?: string;
    signature?: string;
    amount: number;
    currency: string;
    status: "success" | "failed" | "pending";
    webhookProcessed?: boolean;
    errorReason?: string;
  };
  bookingStatus?: "pending" | "confirmed" | "cancelled";
  timestamp?: any;
}

// Slots Management
export const initializeSlotsForDate = async (date: string): Promise<void> => {
  const slotsDoc = doc(db, "slots", date);
  const slotsDocSnap = await getDoc(slotsDoc);

  if (!slotsDocSnap.exists()) {
    // Generate initial slots
    const slots: Record<string, string> = {};
    const startTime = new Date(`2000-01-01T${eventConfig.startTime}:00`);
    const endTime = new Date(`2000-01-01T${eventConfig.endTime}:00`);

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const timeString = currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      slots[timeString] = "available";
      currentTime.setMinutes(currentTime.getMinutes() + eventConfig.slotDuration);
    }

    await setDoc(slotsDoc, slots);
  }
};

export const getSlotsForDate = async (date: string): Promise<Record<string, string>> => {
  const slotsDoc = doc(db, "slots", date);
  const slotsDocSnap = await getDoc(slotsDoc);

  if (slotsDocSnap.exists()) {
    return slotsDocSnap.data() as Record<string, string>;
  }

  return {};
};

export const updateSlotStatus = async (
  date: string,
  timeSlot: string,
  status: "available" | "booked"
): Promise<void> => {
  const slotsDoc = doc(db, "slots", date);
  await updateDoc(slotsDoc, {
    [timeSlot]: status,
  });
};

export const subscribeToSlots = (
  date: string,
  callback: (slots: Record<string, string>) => void
) => {
  const slotsDoc = doc(db, "slots", date);
  return onSnapshot(slotsDoc, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as Record<string, string>);
    } else {
      callback({});
    }
  });
};

// Bookings Management - Flat Structure
export const createBooking = async (booking: Booking): Promise<string> => {
  try {
    const flatBookingsCollection = collection(db, "flatBookings");

    // Generate a unique booking ID
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Prepare booking status
    const bookingStatus = booking.paymentData ? "pending" : "confirmed";

    // Create flat booking records for each time slot
    const performanceType = eventConfig.performanceTypes.find(
      (pt) => pt.id === booking.performanceType
    );

    // Calculate participant count
    let participantCount = 1;
    switch (booking.performanceType) {
      case "solo":
        participantCount = 1;
        break;
      case "duet":
        participantCount = 2;
        break;
      case "group":
        const participantNames = booking.participantDetails.participantNames || "";
        if (participantNames.trim()) {
          const participants = participantNames
            .split(/[,\n]/)
            .filter((name: string) => name.trim()).length;
          participantCount = Math.max(participants, 1);
        } else {
          participantCount = 3; // Default group size
        }
        break;
    }

    // Calculate total amount using time-based pricing if enabled
    const calculateTotalAmount = () => {
      return booking.timeSlots.reduce((total, slot) => {
        const slotPrice = getPriceForSlot(slot, booking.performanceType);
        return total + slotPrice * participantCount;
      }, 0);
    };

    const totalAmount = calculateTotalAmount();
    const fallbackPricePerPerson = performanceType?.pricePerPerson || 0;

    console.log("💰 Pricing calculated:", {
      timePricingEnabled: eventConfig.timePricing?.enabled,
      fallbackPricePerPerson,
      participantCount,
      totalAmount,
      slotsCount: booking.timeSlots.length,
      slotBreakdown: booking.timeSlots.map((slot) => ({
        slot,
        price: getPriceForSlot(slot, booking.performanceType),
      })),
    });

    // Create participant display name based on performance type
    let participantName = "";
    switch (booking.performanceType) {
      case "solo":
        participantName = booking.participantDetails.fullName || "";
        break;
      case "duet":
        participantName = `${booking.participantDetails.participant1Name || ""} & ${
          booking.participantDetails.participant2Name || ""
        }`;
        break;
      case "group":
        participantName = booking.participantDetails.participantNames || "";
        break;
    }

    console.log("👥 Participant name:", participantName);

    // Create flat booking records
    console.log("📋 Creating flat booking records...");
    for (const timeSlot of booking.timeSlots) {
      const slotPrice = getPriceForSlot(timeSlot, booking.performanceType);
      const amountPerSlot = slotPrice * participantCount;

      const flatBooking: FlatBooking = {
        bookingId,
        date: booking.date,
        timeSlot,
        performanceType: booking.performanceType,
        performanceTypeName: performanceType?.name || "",
        pricePerPerson: slotPrice, // Use slot-specific pricing
        participantName,
        // Solo fields
        participantAge: booking.participantDetails.age,
        // Duet fields
        participant1Name: booking.participantDetails.participant1Name,
        participant2Name: booking.participantDetails.participant2Name,
        participant1Phone: booking.participantDetails.participant1Phone,
        participant2Phone: booking.participantDetails.participant2Phone,
        // Group fields
        groupName: booking.participantDetails.participantNames,
        memberNames: booking.participantDetails.participantNames,
        // Common fields
        fullName: booking.participantDetails.fullName,
        phoneNumber: booking.participantDetails.phoneNumber,
        email: booking.participantDetails.email,
        cityResidence: booking.participantDetails.cityResidence,
        rulesRead: booking.participantDetails.rulesRead,
        guruName: booking.participantDetails.guruName,
        performanceCategory: booking.participantDetails.performanceCategory,
        representativePhone: booking.participantDetails.representativePhone,
        danceStyle: booking.participantDetails.performanceCategory || "",
        screenshotUrl: booking.screenshotUrl,
        // Payment details
        paymentId: booking.paymentData?.paymentId,
        paymentStatus: booking.paymentData?.status,
        paymentAmount: booking.paymentData?.amount,
        paymentCurrency: booking.paymentData?.currency,
        timestamp: serverTimestamp(),
        totalSlots: booking.timeSlots.length,
        amountPerSlot,
        bookingStatus,
        // Store original booking data for webhook processing
        originalBookingData: {
          ...booking,
          paymentData: booking.paymentData
            ? Object.fromEntries(
                Object.entries(booking.paymentData).filter(([_, value]) => value !== undefined)
              )
            : undefined,
        },
      };

      // Filter out undefined values to prevent Firebase errors
      const cleanFlatBooking = Object.fromEntries(
        Object.entries(flatBooking).filter(([_, value]) => value !== undefined)
      ) as FlatBooking;

      console.log("📋 Flat booking data:", cleanFlatBooking);
      await addDoc(flatBookingsCollection, cleanFlatBooking);
      // Flat booking created
    }

    console.log("🎉 All bookings created successfully!");
    return bookingId;
  } catch (error: any) {
    console.error("❌ Error in createBooking:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    throw error; // Re-throw to be handled by the calling function
  }
};

export const getFlatBookingsForDate = async (date: string): Promise<FlatBooking[]> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const q = query(flatBookingsCollection, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  const bookings: FlatBooking[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as FlatBooking;
    if (data.date === date) {
      bookings.push({ ...data, id: doc.id });
    }
  });

  return bookings;
};

export const getAllFlatBookings = async (): Promise<FlatBooking[]> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const q = query(flatBookingsCollection, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  const bookings: FlatBooking[] = [];
  querySnapshot.forEach((doc) => {
    bookings.push({ ...(doc.data() as FlatBooking), id: doc.id });
  });

  return bookings;
};

// CSV Export Functions
export const exportBookingsToCSV = async (date?: string): Promise<string> => {
  const bookings = date ? await getFlatBookingsForDate(date) : await getAllFlatBookings();

  if (bookings.length === 0) {
    return "";
  }

  // Define CSV headers
  const headers = [
    "Booking ID",
    "Date",
    "Time Slot",
    "Performance Type",
    "Price Per Person",
    "Participant Name",
    // Contact fields
    "Phone Number",
    "Email",
    "Age",
    // Duet fields
    "Participant 1 Name",
    "Participant 2 Name",
    "Participant 1 Phone",
    "Participant 2 Phone",
    // Group fields
    "Group Names",
    "Representative Phone",
    // Common fields
    "City of Residence",
    "Rules Read",
    "Guru Name",
    "Performance Category",
    "Dance Style",
    "Total Slots",
    "Amount Per Slot",
    "Screenshot URL",
    "Timestamp",
  ];

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...bookings.map((booking) =>
      [
        booking.bookingId,
        booking.date,
        booking.timeSlot,
        booking.performanceTypeName,
        booking.pricePerPerson,
        `"${booking.participantName}"`,
        // Contact fields
        `"${
          booking.performanceType === "duet"
            ? `${booking.participant1Phone || ""} / ${booking.participant2Phone || ""}`
            : booking.phoneNumber || booking.representativePhone || ""
        }"`,
        `"${booking.email || ""}"`,
        booking.participantAge || "",
        // Duet fields
        `"${booking.participant1Name || ""}"`,
        `"${booking.participant2Name || ""}"`,
        `"${booking.participant1Phone || ""}"`,
        `"${booking.participant2Phone || ""}"`,
        // Group fields
        `"${booking.groupName || ""}"`,
        `"${booking.representativePhone || ""}"`,
        // Common fields
        `"${booking.cityResidence || ""}"`,
        `"${booking.rulesRead || ""}"`,
        `"${booking.guruName || ""}"`,
        `"${booking.performanceCategory || ""}"`,
        `"${booking.danceStyle}"`,
        booking.totalSlots,
        booking.amountPerSlot,
        booking.screenshotUrl || "",
        booking.timestamp ? new Date(booking.timestamp.toDate()).toISOString() : "",
      ].join(",")
    ),
  ].join("\n");

  return csvContent;
};

// Find bookings by payment ID or order ID for webhook processing
export const findFlatBookingsByPaymentId = async (paymentId: string): Promise<FlatBooking[]> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const q = query(flatBookingsCollection, where("paymentId", "==", paymentId));
  const querySnapshot = await getDocs(q);

  const bookings: FlatBooking[] = [];
  querySnapshot.forEach((doc) => {
    bookings.push({ ...(doc.data() as FlatBooking), id: doc.id });
  });

  return bookings;
};

export const findFlatBookingsByOrderId = async (orderId: string): Promise<FlatBooking[]> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const q = query(
    flatBookingsCollection,
    where("originalBookingData.paymentData.orderId", "==", orderId)
  );
  const querySnapshot = await getDocs(q);

  const bookings: FlatBooking[] = [];
  querySnapshot.forEach((doc) => {
    bookings.push({ ...(doc.data() as FlatBooking), id: doc.id });
  });

  return bookings;
};

export const updateFlatBookingPaymentStatus = async (
  bookingId: string,
  paymentData: {
    status: "success" | "failed" | "pending";
    paymentId?: string;
    orderId?: string;
    capturedAt?: any;
    webhookProcessed?: boolean;
  },
  bookingStatus: "pending" | "confirmed" | "cancelled"
): Promise<void> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const bookingRef = doc(flatBookingsCollection, bookingId);

  await updateDoc(bookingRef, {
    paymentStatus: paymentData.status,
    paymentId: paymentData.paymentId,
    bookingStatus,
    "originalBookingData.paymentData.status": paymentData.status,
    "originalBookingData.paymentData.paymentId": paymentData.paymentId,
    "originalBookingData.paymentData.orderId": paymentData.orderId,
    "originalBookingData.paymentData.capturedAt": paymentData.capturedAt,
    "originalBookingData.paymentData.webhookProcessed": paymentData.webhookProcessed,
    updatedAt: serverTimestamp(),
  });
};

export const deleteFlatBookingsByBookingId = async (bookingId: string): Promise<void> => {
  const flatBookingsCollection = collection(db, "flatBookings");
  const q = query(flatBookingsCollection, where("bookingId", "==", bookingId));
  const querySnapshot = await getDocs(q);

  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// File Upload
export const uploadScreenshot = async (
  file: File,
  date: string,
  timeSlot: string
): Promise<string> => {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `proofs/${date}/${timeSlot}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
};

// Validation
export const validateSlotsAvailable = async (
  date: string,
  timeSlots: string[]
): Promise<boolean> => {
  const slots = await getSlotsForDate(date);

  for (const slot of timeSlots) {
    if (slots[slot] !== "available") {
      return false;
    }
  }

  return true;
};

// CRUD Operations for Admin Panel
export const deleteBooking = async (bookingId: string): Promise<void> => {
  const flatBookingsCollection = collection(db, "flatBookings");

  // First, get the booking to find its time slot and date
  const bookingRef = doc(flatBookingsCollection, bookingId);
  const bookingDoc = await getDoc(bookingRef);

  if (bookingDoc.exists()) {
    const bookingData = bookingDoc.data() as FlatBooking;

    // Delete the booking
    await deleteDoc(bookingRef);

    // Free up the time slot
    await updateSlotStatus(bookingData.date, bookingData.timeSlot, "available");

    console.log(`✅ Booking deleted and time slot ${bookingData.timeSlot} freed up`);
  } else {
    throw new Error("Booking not found");
  }
};

export const updateBooking = async (booking: FlatBooking): Promise<void> => {
  if (!booking.id) {
    throw new Error("Booking ID is required for update");
  }

  const flatBookingsCollection = collection(db, "flatBookings");
  const bookingRef = doc(flatBookingsCollection, booking.id);

  // Get the original booking to check if time slot changed
  const originalBookingDoc = await getDoc(bookingRef);
  if (originalBookingDoc.exists()) {
    const originalBooking = originalBookingDoc.data() as FlatBooking;

    // If time slot changed, free up the old slot and book the new one
    if (originalBooking.timeSlot !== booking.timeSlot) {
      // Free up the old time slot
      await updateSlotStatus(originalBooking.date, originalBooking.timeSlot, "available");

      // Book the new time slot
      await updateSlotStatus(booking.date, booking.timeSlot, "booked");

      console.log(`✅ Time slot updated: ${originalBooking.timeSlot} → ${booking.timeSlot}`);
    }
  }

  // Remove the id field before updating
  const { id, ...updateData } = booking;

  await updateDoc(bookingRef, {
    ...updateData,
    timestamp: serverTimestamp(),
  });
};

export const addBooking = async (booking: FlatBooking): Promise<void> => {
  const flatBookingsCollection = collection(db, "flatBookings");

  // Book the time slot first
  await updateSlotStatus(booking.date, booking.timeSlot, "booked");

  // Add timestamp if not provided
  const bookingData = {
    ...booking,
    timestamp: serverTimestamp(),
  };

  await addDoc(flatBookingsCollection, bookingData);

  console.log(`✅ New booking added and time slot ${booking.timeSlot} booked`);
};

// Get available time slots for dropdowns
export const getAvailableTimeSlots = async (date: string): Promise<string[]> => {
  // Initialize slots for the date if they don't exist
  await initializeSlotsForDate(date);

  const slots = await getSlotsForDate(date);
  const availableSlots: string[] = [];

  for (const [timeSlot, status] of Object.entries(slots)) {
    if (status === "available") {
      availableSlots.push(timeSlot);
    }
  }

  console.log(`Available slots for ${date}:`, availableSlots);
  return availableSlots.sort();
};

// Check payment and booking status
export const checkPaymentStatus = async (
  paymentId: string
): Promise<{
  booking?: FlatBooking;
  status: "pending" | "confirmed" | "cancelled" | "not_found";
  webhookProcessed: boolean;
}> => {
  try {
    const flatBookingsRef = collection(db, "flatBookings");
    const q = query(flatBookingsRef, where("paymentId", "==", paymentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        status: "not_found",
        webhookProcessed: false,
      };
    }

    const foundBooking = querySnapshot.docs[0].data() as FlatBooking;

    const webhookProcessed =
      foundBooking.originalBookingData?.paymentData?.webhookProcessed || false;
    let status: "pending" | "confirmed" | "cancelled" = "pending";

    if (foundBooking.bookingStatus === "confirmed") {
      status = "confirmed";
    } else if (foundBooking.bookingStatus === "cancelled") {
      status = "cancelled";
    } else if (foundBooking.paymentStatus === "success") {
      status = "confirmed";
    } else if (foundBooking.paymentStatus === "failed") {
      status = "cancelled";
    }

    return {
      booking: foundBooking,
      status,
      webhookProcessed,
    };
  } catch (error) {
    console.error("Error checking payment status:", error);
    return {
      status: "not_found",
      webhookProcessed: false,
    };
  }
};

// Listen to booking status changes
export const listenToBookingStatus = (
  paymentId: string,
  callback: (status: "pending" | "confirmed" | "cancelled", booking?: FlatBooking) => void
) => {
  const flatBookingsRef = collection(db, "flatBookings");

  return onSnapshot(flatBookingsRef, (snapshot) => {
    snapshot.forEach((doc) => {
      const booking = { id: doc.id, ...doc.data() } as FlatBooking;
      if (booking.paymentId === paymentId) {
        let status: "pending" | "confirmed" | "cancelled" = "pending";

        if (booking.bookingStatus === "confirmed") {
          status = "confirmed";
        } else if (booking.bookingStatus === "cancelled") {
          status = "cancelled";
        } else if (booking.paymentStatus === "success") {
          status = "confirmed";
        } else if (booking.paymentStatus === "failed") {
          status = "cancelled";
        }

        callback(status, booking);
      }
    });
  });
};

// Cleanup a failed or timed-out booking by paymentId: frees slots, deletes flat bookings
export const cleanupFailedBooking = async (paymentId: string): Promise<void> => {
  try {
    // Find flat bookings by paymentId
    const flatBookingsRef = collection(db, "flatBookings");
    const bookingQuery = query(flatBookingsRef, where("paymentId", "==", paymentId));
    const bookingSnapshot = await getDocs(bookingQuery);

    if (bookingSnapshot.empty) {
      return; // Nothing to cleanup
    }

    // Get the first booking to extract slot release info
    const firstBooking = bookingSnapshot.docs[0].data() as FlatBooking;

    // Free all reserved slots for this booking if originalBookingData exists
    if (
      firstBooking.originalBookingData?.date &&
      Array.isArray(firstBooking.originalBookingData?.timeSlots)
    ) {
      await Promise.all(
        firstBooking.originalBookingData.timeSlots.map((slot: string) =>
          updateSlotStatus(firstBooking.originalBookingData.date, slot, "available")
        )
      );
    } else {
      // Fallback: free slots individually for each flat booking
      for (const docSnap of bookingSnapshot.docs) {
        const booking = docSnap.data() as FlatBooking;
        await updateSlotStatus(booking.date, booking.timeSlot, "available");
      }
    }

    // Delete all flat bookings with this paymentId
    const batch = writeBatch(db);
    bookingSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.error("Error during cleanupFailedBooking:", error);
  }
};
