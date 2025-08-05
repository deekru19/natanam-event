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
