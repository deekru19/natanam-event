import { eventConfig } from "../config/eventConfig";

export interface TimeSlot {
  time: string;
  status: "available" | "booked";
}

export const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startTime = new Date(`2000-01-01T${eventConfig.startTime}:00`);
  const endTime = new Date(`2000-01-01T${eventConfig.endTime}:00`);

  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const timeString = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    slots.push({
      time: timeString,
      status: "available",
    });

    // Add slot duration minutes
    currentTime.setMinutes(currentTime.getMinutes() + eventConfig.slotDuration);
  }

  return slots;
};

export const formatTimeForDisplay = (time: string): string => {
  return time; // Already formatted in generateTimeSlots
};

export const formatTimeForStorage = (time: string): string => {
  // Convert 12-hour format to 24-hour format for storage
  const [timeStr, period] = time.split(" ");
  const [hours, minutes] = timeStr.split(":");
  let hour = parseInt(hours);

  if (period === "PM" && hour !== 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minutes}`;
};

export const isAdjacentSlot = (slot1: string, slot2: string): boolean => {
  const time1 = new Date(`2000-01-01T${formatTimeForStorage(slot1)}:00`);
  const time2 = new Date(`2000-01-01T${formatTimeForStorage(slot2)}:00`);

  const diffMinutes = Math.abs(time2.getTime() - time1.getTime()) / (1000 * 60);
  return diffMinutes === eventConfig.slotDuration;
};

export const getEventDate = (): string => {
  return eventConfig.eventDate;
};

// Helper function to sort time slots by time of day
export const sortTimeSlots = (slots: Record<string, string>): Record<string, string> => {
  const sortedEntries = Object.entries(slots).sort(([timeA], [timeB]) => {
    const timeA24 = formatTimeForStorage(timeA);
    const timeB24 = formatTimeForStorage(timeB);
    return timeA24.localeCompare(timeB24);
  });

  return Object.fromEntries(sortedEntries);
};

// Helper function to convert time to minutes for sorting
export const timeToMinutes = (time: string): number => {
  const [timeStr, period] = time.split(" ");
  const [hours, minutes] = timeStr.split(":").map(Number);
  let hour = hours;

  if (period === "PM" && hour !== 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minutes;
};

// Time-based pricing utilities
export const getPricingTier = (timeSlot: string): "offPeak" | "midPeak" | "onPeak" | null => {
  if (!eventConfig.timePricing?.enabled) {
    return null;
  }

  const slotTime24 = formatTimeForStorage(timeSlot);
  const { timeRanges } = eventConfig.timePricing;

  // Check if time falls within any range (only if that range is configured)
  if (
    timeRanges.offPeak &&
    isTimeInRange(slotTime24, timeRanges.offPeak.start, timeRanges.offPeak.end)
  ) {
    return "offPeak";
  }
  if (
    timeRanges.midPeak &&
    isTimeInRange(slotTime24, timeRanges.midPeak.start, timeRanges.midPeak.end)
  ) {
    return "midPeak";
  }
  if (
    timeRanges.onPeak &&
    isTimeInRange(slotTime24, timeRanges.onPeak.start, timeRanges.onPeak.end)
  ) {
    return "onPeak";
  }

  return null;
};

export const isTimeInRange = (time: string, start: string, end: string): boolean => {
  const timeMinutes = convertTimeToMinutes(time);
  const startMinutes = convertTimeToMinutes(start);
  const endMinutes = convertTimeToMinutes(end);

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};

export const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getPriceForSlot = (timeSlot: string, performanceType: string): number => {
  if (!eventConfig.timePricing?.enabled) {
    // Fallback to original pricing
    const type = eventConfig.performanceTypes.find((t) => t.id === performanceType);
    return type?.pricePerPerson || 0;
  }

  const tier = getPricingTier(timeSlot);
  if (!tier || !eventConfig.timePricing.pricing[tier]) {
    // Fallback to original pricing if tier not found or not configured
    const type = eventConfig.performanceTypes.find((t) => t.id === performanceType);
    return type?.pricePerPerson || 0;
  }

  const pricing = eventConfig.timePricing.pricing[tier]!;
  switch (performanceType) {
    case "solo":
      return pricing.solo;
    case "duet":
      return pricing.duet;
    case "group":
      return pricing.group;
    default:
      return 0;
  }
};

export const getSlotColor = (timeSlot: string): string => {
  if (!eventConfig.timePricing?.enabled) {
    return "transparent"; // Default color when time pricing is disabled
  }

  const tier = getPricingTier(timeSlot);
  if (!tier || !eventConfig.timePricing.pricing[tier]) return "transparent";

  return eventConfig.timePricing.pricing[tier]!.color;
};

export const getSlotBorderColor = (timeSlot: string): string => {
  if (!eventConfig.timePricing?.enabled) {
    return "transparent"; // Default color when time pricing is disabled
  }

  const tier = getPricingTier(timeSlot);
  if (!tier || !eventConfig.timePricing.pricing[tier]) return "transparent";

  return eventConfig.timePricing.pricing[tier]!.borderColor;
};

export const getTierDisplayName = (tier: "offPeak" | "midPeak" | "onPeak" | null): string | null => {
  if (!tier || !eventConfig.timePricing?.enabled) {
    return null;
  }

  const timeRange = eventConfig.timePricing.timeRanges[tier];
  return timeRange?.displayName || null;
};

export const getPricingTierInfo = () => {
  if (!eventConfig.timePricing?.enabled) {
    return null;
  }

  const result: Record<string, any> = {};

  // Only include configured tiers
  if (eventConfig.timePricing.timeRanges.offPeak && eventConfig.timePricing.pricing.offPeak) {
    result.offPeak = {
      name: eventConfig.timePricing.timeRanges.offPeak.displayName,
      timeRange: `${eventConfig.timePricing.timeRanges.offPeak.start} - ${eventConfig.timePricing.timeRanges.offPeak.end}`,
      pricing: eventConfig.timePricing.pricing.offPeak,
    };
  }

  if (eventConfig.timePricing.timeRanges.midPeak && eventConfig.timePricing.pricing.midPeak) {
    result.midPeak = {
      name: eventConfig.timePricing.timeRanges.midPeak.displayName,
      timeRange: `${eventConfig.timePricing.timeRanges.midPeak.start} - ${eventConfig.timePricing.timeRanges.midPeak.end}`,
      pricing: eventConfig.timePricing.pricing.midPeak,
    };
  }

  if (eventConfig.timePricing.timeRanges.onPeak && eventConfig.timePricing.pricing.onPeak) {
    result.onPeak = {
      name: eventConfig.timePricing.timeRanges.onPeak.displayName,
      timeRange: `${eventConfig.timePricing.timeRanges.onPeak.start} - ${eventConfig.timePricing.timeRanges.onPeak.end}`,
      pricing: eventConfig.timePricing.pricing.onPeak,
    };
  }

  return Object.keys(result).length > 0 ? result : null;
};
