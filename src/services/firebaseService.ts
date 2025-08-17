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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { TimeSlot } from "../utils/timeUtils";
import { eventConfig } from "../config/eventConfig";

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
    const bookingsCollection = collection(db, "bookings");
    const flatBookingsCollection = collection(db, "flatBookings");

    // Prepare booking data, filtering out undefined paymentData fields
    const bookingDataRaw = {
      ...booking,
      bookingStatus: booking.paymentData ? "pending" : "confirmed",
      timestamp: serverTimestamp(),
    };
    // Clean nested paymentData
    const paymentDataClean = bookingDataRaw.paymentData
      ? Object.fromEntries(
          Object.entries(bookingDataRaw.paymentData).filter(([_, value]) => value !== undefined)
        )
      : undefined;
    const bookingData = {
      ...bookingDataRaw,
      paymentData: paymentDataClean,
    };
    const docRef = await addDoc(bookingsCollection, bookingData);
    const bookingId = docRef.id;
    // Main booking created

    // Create flat booking records for each time slot
    const performanceType = eventConfig.performanceTypes.find(
      (pt) => pt.id === booking.performanceType
    );
    const pricePerPerson = performanceType?.pricePerPerson || 0;

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

    const amountPerSlot = pricePerPerson * participantCount;

    console.log("💰 Pricing calculated:", {
      pricePerPerson,
      participantCount,
      amountPerSlot,
      totalAmountForAllSlots: amountPerSlot * booking.timeSlots.length,
      slotsCount: booking.timeSlots.length,
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
      const flatBooking: FlatBooking = {
        bookingId,
        date: booking.date,
        timeSlot,
        performanceType: booking.performanceType,
        performanceTypeName: performanceType?.name || "",
        pricePerPerson,
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
    // Solo fields
    "Full Name",
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
        // Solo fields
        `"${booking.fullName || ""}"`,
        `"${booking.phoneNumber || ""}"`,
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

// Sync payment status from main bookings to flat bookings
export const syncPaymentStatusToFlatBookings = async (): Promise<void> => {
  try {
    console.log("🔄 Syncing payment status from main bookings to flat bookings...");

    // Get all main bookings
    const mainBookingsRef = collection(db, "bookings");
    const mainBookingsQuery = query(mainBookingsRef, orderBy("timestamp", "desc"));
    const mainBookingsSnapshot = await getDocs(mainBookingsQuery);

    // Get all flat bookings
    const flatBookingsRef = collection(db, "flatBookings");
    const flatBookingsQuery = query(flatBookingsRef, orderBy("timestamp", "desc"));
    const flatBookingsSnapshot = await getDocs(flatBookingsQuery);

    const updates: Promise<void>[] = [];

    // For each main booking, find and update corresponding flat bookings
    mainBookingsSnapshot.forEach((mainDoc) => {
      const mainBooking = mainDoc.data();
      const mainBookingId = mainDoc.id;

      if (mainBooking.paymentData?.paymentId || mainBooking.paymentData?.orderId) {
        // Find flat bookings with this booking ID
        flatBookingsSnapshot.forEach((flatDoc) => {
          const flatBooking = flatDoc.data();

          if (flatBooking.bookingId === mainBookingId) {
            // Update flat booking with latest payment status
            const updateData: Partial<FlatBooking> = {
              paymentId: mainBooking.paymentData?.paymentId,
              paymentStatus: mainBooking.paymentData?.status,
              paymentAmount: mainBooking.paymentData?.amount,
              paymentCurrency: mainBooking.paymentData?.currency,
            };

            // Filter out undefined values
            const cleanUpdateData = Object.fromEntries(
              Object.entries(updateData).filter(([_, value]) => value !== undefined)
            );

            if (Object.keys(cleanUpdateData).length > 0) {
              updates.push(updateDoc(flatDoc.ref, cleanUpdateData));
            }
          }
        });
      }
    });

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Synced payment status for ${updates.length} flat bookings`);
    } else {
      console.log("ℹ️ No payment status updates needed");
    }
  } catch (error) {
    console.error("❌ Error syncing payment status:", error);
    throw error;
  }
};

// Check payment and booking status
export const checkPaymentStatus = async (
  paymentId: string
): Promise<{
  booking?: Booking;
  status: "pending" | "confirmed" | "cancelled" | "not_found";
  webhookProcessed: boolean;
}> => {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    let foundBooking: Booking | undefined;

    querySnapshot.forEach((doc) => {
      const booking = { id: doc.id, ...doc.data() } as Booking;
      if (booking.paymentData?.paymentId === paymentId) {
        foundBooking = booking;
      }
    });

    if (!foundBooking) {
      return {
        status: "not_found",
        webhookProcessed: false,
      };
    }

    const webhookProcessed = foundBooking.paymentData?.webhookProcessed || false;
    let status: "pending" | "confirmed" | "cancelled" = "pending";

    if (foundBooking.bookingStatus === "confirmed") {
      status = "confirmed";
    } else if (foundBooking.bookingStatus === "cancelled") {
      status = "cancelled";
    } else if (foundBooking.paymentData?.status === "success") {
      status = "confirmed";
    } else if (foundBooking.paymentData?.status === "failed") {
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
  callback: (status: "pending" | "confirmed" | "cancelled", booking?: Booking) => void
) => {
  const bookingsRef = collection(db, "bookings");

  return onSnapshot(bookingsRef, (snapshot) => {
    snapshot.forEach((doc) => {
      const booking = { id: doc.id, ...doc.data() } as Booking;
      if (booking.paymentData?.paymentId === paymentId) {
        let status: "pending" | "confirmed" | "cancelled" = "pending";

        if (booking.bookingStatus === "confirmed") {
          status = "confirmed";
        } else if (booking.bookingStatus === "cancelled") {
          status = "cancelled";
        } else if (booking.paymentData?.status === "success") {
          status = "confirmed";
        } else if (booking.paymentData?.status === "failed") {
          status = "cancelled";
        }

        callback(status, booking);
      }
    });
  });
};

// Cleanup a failed or timed-out booking by paymentId: frees slots, deletes flat bookings and booking
export const cleanupFailedBooking = async (paymentId: string): Promise<void> => {
  try {
    // Find the booking by paymentId
    const bookingsRef = collection(db, "bookings");
    const bookingQuery = query(bookingsRef, where("paymentData.paymentId", "==", paymentId));
    const bookingSnapshot = await getDocs(bookingQuery);

    if (bookingSnapshot.empty) {
      return; // Nothing to cleanup
    }

    const bookingDoc = bookingSnapshot.docs[0];
    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

    // Free all reserved slots for this booking
    if (booking?.date && Array.isArray(booking?.timeSlots)) {
      await Promise.all(
        booking.timeSlots.map((slot) => updateSlotStatus(booking.date, slot, "available"))
      );
    }

    // Delete associated flat bookings
    const flatBookingsRef = collection(db, "flatBookings");
    const flatQuery = query(flatBookingsRef, where("bookingId", "==", bookingDoc.id));
    const flatSnapshot = await getDocs(flatQuery);
    await Promise.all(flatSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));

    // Delete the main booking document
    await deleteDoc(bookingDoc.ref);
  } catch (error) {
    console.error("Error during cleanupFailedBooking:", error);
  }
};
