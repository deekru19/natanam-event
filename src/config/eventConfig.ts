export interface EventConfig {
  eventDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  slotDuration: number; // in minutes
  performanceTypes: PerformanceType[];
}

export interface PerformanceType {
  id: string;
  name: string;
  pricePerSlot: number;
  formFields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "textarea";
  required: boolean;
  placeholder?: string;
}

export const eventConfig: EventConfig = {
  eventDate: "2024-12-15", // Configure your event date here
  startTime: "09:00", // 9 AM
  endTime: "20:00", // 8 PM
  slotDuration: 10, // 10 minutes
  performanceTypes: [
    {
      id: "solo",
      name: "Solo",
      pricePerSlot: 300,
      formFields: [
        { id: "name", label: "Name", type: "text", required: true, placeholder: "Enter your name" },
        { id: "age", label: "Age", type: "number", required: true, placeholder: "Enter your age" },
        {
          id: "danceStyle",
          label: "Dance Style",
          type: "text",
          required: true,
          placeholder: "e.g., Classical, Contemporary, Hip-hop",
        },
      ],
    },
    {
      id: "duet",
      name: "Duet",
      pricePerSlot: 500,
      formFields: [
        {
          id: "participant1Name",
          label: "Name of Participant 1",
          type: "text",
          required: true,
          placeholder: "Enter first participant name",
        },
        {
          id: "participant2Name",
          label: "Name of Participant 2",
          type: "text",
          required: true,
          placeholder: "Enter second participant name",
        },
        { id: "ages", label: "Ages", type: "text", required: true, placeholder: "e.g., 25, 28" },
        {
          id: "danceStyle",
          label: "Dance Style",
          type: "text",
          required: true,
          placeholder: "e.g., Classical, Contemporary, Hip-hop",
        },
      ],
    },
    {
      id: "group",
      name: "Group",
      pricePerSlot: 700,
      formFields: [
        {
          id: "groupName",
          label: "Group Name",
          type: "text",
          required: true,
          placeholder: "Enter group name",
        },
        {
          id: "memberCount",
          label: "Number of Members",
          type: "number",
          required: true,
          placeholder: "Enter number of members",
        },
        {
          id: "memberNames",
          label: "Names of Members",
          type: "textarea",
          required: true,
          placeholder: "Enter names of all members (one per line)",
        },
        {
          id: "danceStyle",
          label: "Dance Style",
          type: "text",
          required: true,
          placeholder: "e.g., Classical, Contemporary, Hip-hop",
        },
      ],
    },
  ],
};

export default eventConfig;
