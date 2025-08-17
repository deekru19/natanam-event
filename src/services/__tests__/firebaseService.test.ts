import { jest } from "@jest/globals";
import * as firestore from "firebase/firestore";
// Removed unused config import to fix module resolution
import { createBooking, Booking } from "../firebaseService";

describe("firebaseService.createBooking", () => {
  const mockAddDoc = firestore.addDoc as jest.Mock;
  const mockServerTimestamp = firestore.serverTimestamp as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    // serverTimestamp returns a consistent placeholder
    mockServerTimestamp.mockReturnValue("SERVER_TIMESTAMP");
  });

  it("should create a booking without paymentData and return bookingId", async () => {
    // Mock first addDoc (flatBookingsCollection)
    mockAddDoc
      .mockResolvedValueOnce({ id: "flatBooking1" })
      // Mock subsequent addDoc calls (flatBookingsCollection)
      .mockResolvedValueOnce({ id: "flatBooking2" });

    const bookingInput: Booking = {
      date: "2025-08-07",
      timeSlots: ["10:00 AM", "10:30 AM"],
      performanceType: "solo",
      participantDetails: {
        fullName: "Alice",
        phoneNumber: "1234567890",
        email: "alice@example.com",
        age: "25",
      },
      screenshotUrl: undefined,
      paymentData: undefined,
    };

    const bookingId = await createBooking(bookingInput);
    expect(bookingId).toBe("booking-123");

    // Validate addDoc calls
    // Should call addDoc twice (for each time slot in flatBookings)
    expect(mockAddDoc).toHaveBeenCalledTimes(2);

    // First call: flatBookingsCollection and data for first time slot
    expect(mockAddDoc).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        bookingId: expect.stringMatching(/^booking_\d+_[a-z0-9]+$/),
        date: "2025-08-07",
        timeSlot: "10:00 AM",
        performanceType: "solo",
        bookingStatus: "confirmed",
      })
    );

    // Second call: flatBookingsCollection and data for second time slot
    expect(mockAddDoc).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        bookingId: expect.stringMatching(/^booking_\d+_[a-z0-9]+$/),
        date: "2025-08-07",
        timeSlot: "11:00 AM",
        performanceType: "solo",
        bookingStatus: "confirmed",
      })
    );
  });

  it("should clean nested paymentData and filter undefined fields", async () => {
    // Prepare mocks
    mockAddDoc.mockResolvedValue({ id: "flatBooking1" });

    const rawPaymentData = {
      paymentId: "pay-001",
      orderId: undefined,
      signature: "sig-abc",
      amount: 150,
      currency: "INR",
      status: "success" as const,
      webhookProcessed: undefined,
      errorReason: "none",
    };

    const bookingInput: Booking = {
      date: "2025-08-08",
      timeSlots: ["11:00 AM"],
      performanceType: "duet",
      participantDetails: {
        participant1Name: "Bob",
        participant2Name: "Carol",
        participant1Phone: "1111111111",
        participant2Phone: "2222222222",
      },
      paymentData: rawPaymentData,
    };

    const bookingId = await createBooking(bookingInput);
    expect(bookingId).toMatch(/^booking_\d+_[a-z0-9]+$/);

    // Extract the data passed to the first addDoc call (flat booking)
    const firstCall = mockAddDoc.mock.calls[0];
    const passedData = firstCall[1];
    // originalBookingData.paymentData should not include undefined fields (orderId, webhookProcessed)
    expect(passedData.originalBookingData.paymentData).toEqual({
      paymentId: "pay-001",
      signature: "sig-abc",
      amount: 150,
      currency: "INR",
      status: "success",
      errorReason: "none",
    });
  });
});

describe("firebaseService.getFlatBookingsForDate and getAllFlatBookings", () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockOrderBy = firestore.orderBy as jest.Mock;
  const mockQuery = firestore.query as jest.Mock;
  const mockCollection = firestore.collection as jest.Mock;
  const fakeDocs: any[] = [];
  beforeEach(() => {
    jest.resetAllMocks();
    // Mock getDocs to yield controlled docs
    mockGetDocs.mockResolvedValue({
      forEach: (cb: Function) => fakeDocs.forEach((d) => cb({ id: d.id, data: () => d.data })),
    });
    mockCollection.mockImplementation((dbArg, name) => ({ dbArg, name }));
    mockOrderBy.mockImplementation((field, dir) => ({ field, dir }));
    mockQuery.mockImplementation((col, order) => ({ col, order }));
  });

  it("should return only bookings matching the date for getFlatBookingsForDate", async () => {
    fakeDocs.length = 0;
    fakeDocs.push({ id: "1", data: { date: "2025-08-07", foo: "bar" } });
    fakeDocs.push({ id: "2", data: { date: "2025-08-08", foo: "baz" } });
    const { getFlatBookingsForDate } = await import("../firebaseService");
    const results = await getFlatBookingsForDate("2025-08-07");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].date).toBe("2025-08-07");
  });

  it("should return all bookings for getAllFlatBookings", async () => {
    fakeDocs.length = 0;
    fakeDocs.push({ id: "A", data: { date: "x" } });
    fakeDocs.push({ id: "B", data: { date: "y" } });
    const { getAllFlatBookings } = await import("../firebaseService");
    const results = await getAllFlatBookings();
    expect(results.map((b: any) => b.id)).toEqual(["A", "B"]);
  });
});

describe("firebaseService.validateSlotsAvailable", () => {
  it("returns true when all slots available", async () => {
    const { validateSlotsAvailable } = await import("../firebaseService");
    // Spy on getSlotsForDate
    jest.spyOn(require("../firebaseService"), "getSlotsForDate").mockResolvedValue({
      "10:00": "available",
      "10:30": "available",
    });
    const ok = await validateSlotsAvailable("2025-08-07", ["10:00", "10:30"]);
    expect(ok).toBe(true);
  });
  it("returns false if any slot unavailable", async () => {
    const { validateSlotsAvailable } = await import("../firebaseService");
    jest.spyOn(require("../firebaseService"), "getSlotsForDate").mockResolvedValue({
      "11:00": "booked",
      "11:30": "available",
    });
    const ok = await validateSlotsAvailable("2025-08-07", ["11:00", "11:30"]);
    expect(ok).toBe(false);
  });
});

describe("firebaseService.exportBookingsToCSV", () => {
  it("generates CSV with headers and rows", async () => {
    const { exportBookingsToCSV } = await import("../firebaseService");
    const csv = await exportBookingsToCSV();
    // Check headers
    expect(csv.split("\n")[0]).toContain("Booking ID,Date,Time Slot");
  });
});
