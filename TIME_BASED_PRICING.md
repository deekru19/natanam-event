# Time-Based Pricing Feature

## Overview

The time-based pricing feature allows you to set different prices for different time periods throughout the day. This is useful for implementing peak, mid-peak, and off-peak pricing strategies.

## Configuration

### Enabling Time-Based Pricing

To enable time-based pricing, edit `src/config/eventConfig.ts` and add the `timePricing` configuration:

```typescript
export const eventConfig: EventConfig = {
  eventDate: "2024-12-15",
  startTime: "09:00",
  endTime: "20:00",
  slotDuration: 10,

  // Enable time-based pricing
  timePricing: {
    enabled: true,
    timeRanges: {
      offPeak: { start: "09:00", end: "12:00" },
      midPeak: { start: "12:00", end: "17:00" },
      onPeak: { start: "17:00", end: "20:00" },
    },
    pricing: {
      offPeak: { solo: 1200, duet: 650, group: 400, color: "#FEF08A" }, // yellow
      midPeak: { solo: 1500, duet: 800, group: 500, color: "#FB923C" }, // orange
      onPeak: { solo: 1800, duet: 950, group: 600, color: "#A855F7" }, // violet
    },
  },

  performanceTypes: [
    // ... your existing performance types
  ],
};
```

### Configuration Options

#### Time Ranges

- **offPeak**: Cheapest pricing tier (e.g., morning hours)
- **midPeak**: Medium pricing tier (e.g., afternoon hours)
- **onPeak**: Most expensive pricing tier (e.g., evening hours)

Time format: Use 24-hour format (HH:MM), e.g., "09:00", "17:30"

#### Pricing Structure

For each tier, specify prices for:

- **solo**: Price per person for solo performance
- **duet**: Price per person for duet performance
- **group**: Price per person for group performance
- **color**: Background color for time slots (hex format)

#### Color Recommendations

- **Off Peak**: Light colors like `#FEF08A` (yellow)
- **Mid Peak**: Medium colors like `#FB923C` (orange)
- **On Peak**: Darker/bold colors like `#A855F7` (violet)

## Features

### Visual Indicators

When time-based pricing is enabled:

- **Color-coded slots**: Each time slot shows its pricing tier with background colors
- **Pricing legend**: Displays above the time slots showing all tiers and their pricing
- **Tooltips**: Hover over slots to see pricing tier and amount
- **Slot labels**: Each slot shows the price directly on the button

### Pricing Display

- **Payment Summary**: Shows detailed breakdown of selected slots with individual pricing
- **Real-time calculation**: Total amount updates based on selected time slots
- **Backwards compatibility**: Falls back to original pricing when disabled

### Admin Features

- **Booking management**: Admin panel continues to work with time-based pricing
- **Price tracking**: Each booking stores the actual price paid for the time slot

## Backwards Compatibility

The feature is fully backwards compatible:

1. **When `timePricing` is not configured**: App works exactly as before using `pricePerPerson` from performance types
2. **When `timePricing.enabled` is false**: Same fallback behavior
3. **Existing bookings**: Continue to work and display correctly

## Disabling Time-Based Pricing

To disable time-based pricing, either:

1. Remove the `timePricing` object entirely, or
2. Set `timePricing.enabled` to `false`, or
3. Comment out the `timePricing` configuration

When disabled, the app will use the original `pricePerPerson` values from the performance types.

## Testing

1. **Enable time-based pricing** in the configuration
2. **Select different time slots** to see color coding and pricing
3. **Check payment summary** for correct breakdown
4. **Test with different performance types** (solo, duet, group)
5. **Disable time-based pricing** to verify fallback behavior

## Example Usage

```typescript
// Example configuration for a dance event
timePricing: {
  enabled: true,
  timeRanges: {
    offPeak: { start: "09:00", end: "14:00" },  // Morning to early afternoon
    midPeak: { start: "14:00", end: "18:00" },  // Late afternoon
    onPeak: { start: "18:00", end: "21:00" }    // Evening prime time
  },
  pricing: {
    offPeak: { solo: 1000, duet: 600, group: 350, color: "#FBBF24" },
    midPeak: { solo: 1300, duet: 750, group: 450, color: "#F97316" },
    onPeak: { solo: 1600, duet: 900, group: 550, color: "#8B5CF6" }
  }
}
```

This configuration would create:

- **Morning slots (9 AM - 2 PM)**: Cheapest rates with golden background
- **Afternoon slots (2 PM - 6 PM)**: Medium rates with orange background
- **Evening slots (6 PM - 9 PM)**: Premium rates with purple background
