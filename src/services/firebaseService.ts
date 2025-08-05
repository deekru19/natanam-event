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
  pricePerSlot: number;
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
  totalAmount: number;
}

export interface Booking {
  id?: string;
  date: string;
  timeSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  screenshotUrl?: string;
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
    console.log("🚀 Starting booking creation...");
    console.log("📊 Booking data:", booking);
    console.log("📊 Participant details:", booking.participantDetails);
    console.log("📊 Participant details keys:", Object.keys(booking.participantDetails));

    const bookingsCollection = collection(db, "bookings");
    const flatBookingsCollection = collection(db, "flatBookings");

    const bookingData = {
      ...booking,
      timestamp: serverTimestamp(),
    };

    console.log("📝 Adding to bookings collection...");
    const docRef = await addDoc(bookingsCollection, bookingData);
    const bookingId = docRef.id;
    console.log("✅ Main booking created with ID:", bookingId);

    // Create flat booking records for each time slot
    const performanceType = eventConfig.performanceTypes.find(
      (pt) => pt.id === booking.performanceType
    );
    const pricePerSlot = performanceType?.pricePerSlot || 0;
    const totalAmount = booking.timeSlots.length * pricePerSlot;

    console.log("💰 Pricing calculated:", {
      pricePerSlot,
      totalAmount,
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
      console.log("📋 Creating flat booking for slot:", timeSlot);

      const flatBooking: FlatBooking = {
        bookingId,
        date: booking.date,
        timeSlot,
        performanceType: booking.performanceType,
        performanceTypeName: performanceType?.name || "",
        pricePerSlot,
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
        timestamp: serverTimestamp(),
        totalSlots: booking.timeSlots.length,
        totalAmount,
      };

      // Filter out undefined values to prevent Firebase errors
      const cleanFlatBooking = Object.fromEntries(
        Object.entries(flatBooking).filter(([_, value]) => value !== undefined)
      ) as FlatBooking;

      console.log("📋 Flat booking data:", cleanFlatBooking);
      await addDoc(flatBookingsCollection, cleanFlatBooking);
      console.log("✅ Flat booking created for slot:", timeSlot);
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
    "Price Per Slot",
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
    "Total Amount",
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
        booking.pricePerSlot,
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
        booking.totalAmount,
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
  const bookingRef = doc(flatBookingsCollection, bookingId);
  await deleteDoc(bookingRef);
};

export const updateBooking = async (booking: FlatBooking): Promise<void> => {
  if (!booking.id) {
    throw new Error("Booking ID is required for update");
  }

  const flatBookingsCollection = collection(db, "flatBookings");
  const bookingRef = doc(flatBookingsCollection, booking.id);

  // Remove the id field before updating
  const { id, ...updateData } = booking;

  await updateDoc(bookingRef, {
    ...updateData,
    timestamp: serverTimestamp(),
  });
};

export const addBooking = async (booking: FlatBooking): Promise<void> => {
  const flatBookingsCollection = collection(db, "flatBookings");

  // Add timestamp if not provided
  const bookingData = {
    ...booking,
    timestamp: serverTimestamp(),
  };

  await addDoc(flatBookingsCollection, bookingData);
};
