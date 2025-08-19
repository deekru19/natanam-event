export interface EventConfig {
  eventName: string; // Display name for the event
  eventDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  slotDuration: number; // in minutes
  performanceTypes: PerformanceType[];
  timePricing?: TimePricingConfig; // Optional time-based pricing
}

export interface PerformanceType {
  id: string;
  name: string;
  pricePerPerson: number; // Used as fallback if timePricing not configured
  formFields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "checkbox";
  required: boolean;
  placeholder?: string;
}

export interface TimePricingConfig {
  enabled: boolean;
  timeRanges: {
    offPeak?: { start: string; end: string; displayName: string }; // HH:MM format, optional
    midPeak?: { start: string; end: string; displayName: string }; // Optional
    onPeak?: { start: string; end: string; displayName: string }; // Optional
  };
  pricing: {
    offPeak?: { solo: number; duet: number; group: number; color: string; borderColor: string }; // Optional
    midPeak?: { solo: number; duet: number; group: number; color: string; borderColor: string }; // Optional
    onPeak?: { solo: number; duet: number; group: number; color: string; borderColor: string }; // Optional
  };
}

export const eventConfig: EventConfig = {
  eventName: "Shyamotsava", // Configure your event name here
  eventDate: "2025-08-16", // Configure your event date here
  startTime: "09:00", // 9 AM
  endTime: "20:00", // 8 PM
  slotDuration: 10, // 10 minutes

  // Optional: Enable time-based pricing by uncommenting below
  // Example with all 3 tiers:
  timePricing: {
    enabled: true,
    timeRanges: {
      offPeak: { start: "09:00", end: "12:00", displayName: "Early Bird" },
      midPeak: { start: "12:00", end: "17:00", displayName: "Regular" },
      onPeak: { start: "17:00", end: "20:00", displayName: "Prime Time" },
    },
    pricing: {
      offPeak: {
        solo: 1200,
        duet: 650,
        group: 400,
        color: "#ffffffff", // yellow-100 (lighter)
        borderColor: "#edca8eff", // yellow-500 (darker border)
      },
      midPeak: {
        solo: 1500,
        duet: 800,
        group: 500,
        color: "#ffffffff", // orange-200 (lighter)
        borderColor: "#9ee96fff", // orange-600 (darker border)
      },
      onPeak: {
        solo: 1800,
        duet: 950,
        group: 600,
        color: "#ffffffff", // violet-200 (lighter)
        borderColor: "#bca6e3ff", // violet-600 (darker border)
      },
    },
  },

  // Example with only 2 tiers (peak and off-peak):
  // timePricing: {
  //   enabled: true,
  //   timeRanges: {
  //     offPeak: { start: "09:00", end: "17:00", displayName: "Regular Hours" },
  //     onPeak: { start: "17:00", end: "20:00", displayName: "Prime Time" },
  //   },
  //   pricing: {
  //     offPeak: {
  //       solo: 1200, duet: 650, group: 400,
  //       color: "#FEF3C7",
  //       borderColor: "#F59E0B"
  //     },
  //     onPeak: {
  //       solo: 1800, duet: 950, group: 600,
  //       color: "#E9D5FF",
  //       borderColor: "#7C3AED"
  //     },
  //   },
  // },

  // Example with only 1 tier (all same pricing as before):
  // timePricing: {
  //   enabled: false,
  // },

  performanceTypes: [
    {
      id: "solo",
      name: "Solo",
      pricePerPerson: 1500,
      formFields: [
        {
          id: "fullName",
          label: "Full name of the participant",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: false,
          placeholder: "Your answer",
        },
        {
          id: "phoneNumber",
          label: "Phone Number of the participant / parent",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "cityResidence",
          label: "City of residence",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "rulesRead",
          label: "Have you read the rules and regulations of this festival?",
          type: "checkbox",
          required: true,
          placeholder: "",
        },
        {
          id: "guruName",
          label: "Guru's Name",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "performanceCategory",
          label: "Category of performance (Eg. Odissi, Bharathanatyam, Kathak)",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
      ],
    },
    {
      id: "duet",
      name: "Duet",
      pricePerPerson: 800,
      formFields: [
        {
          id: "participant1Name",
          label: "Full name of participant 1",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "participant1Phone",
          label: "Phone number of participant 1/parent",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "participant2Name",
          label: "Full name of participant 2",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "participant2Phone",
          label: "Phone Number of the participant 2 / parent",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "cityResidence",
          label: "City of residence",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "rulesRead",
          label: "Have you read the rules and regulations of this festival?",
          type: "checkbox",
          required: true,
          placeholder: "",
        },
        {
          id: "guruName",
          label: "Guru's Name",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "performanceCategory",
          label: "Category of performance (Eg. Odissi, Bharathanatyam, Kathak)",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
      ],
    },
    {
      id: "group",
      name: "Group",
      pricePerPerson: 500,
      formFields: [
        {
          id: "participantNames",
          label: "Full names of the participants (Eg. Ananya M, Surabhi Shenoy, Tanisha B.K)",
          type: "textarea",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "representativePhone",
          label: "Phone Number of the group representative / parent in-charge",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "cityResidence",
          label: "City of residence",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "rulesRead",
          label: "Have you read the rules and regulations of this festival?",
          type: "checkbox",
          required: true,
          placeholder: "",
        },
        {
          id: "guruName",
          label: "Guru's Name",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
        {
          id: "performanceCategory",
          label: "Category of performance (Eg. Odissi, Bharathanatyam, Kathak)",
          type: "text",
          required: true,
          placeholder: "Your answer",
        },
      ],
    },
  ],
};

export default eventConfig;
