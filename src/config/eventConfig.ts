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
  type: "text" | "number" | "textarea" | "checkbox";
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
      pricePerSlot: 500,
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
      pricePerSlot: 700,
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
