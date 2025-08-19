import React, { useState, useEffect } from 'react';
import { subscribeToSlots, initializeSlotsForDate } from '../services/firebaseService';
import { getEventDate, isAdjacentSlot, sortTimeSlots, timeToMinutes, getPricingTier, getSlotColor, getSlotBorderColor, getPricingTierInfo, getPriceForSlot } from '../utils/timeUtils';
import { eventConfig } from '../config/eventConfig';

interface TimeSlotSelectorProps {
  selectedSlots: string[];
  onSlotSelection: (slots: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  performanceType: string; // Add this to get pricing info
}

interface TimeSection {
  title: string;
  startTime: number; // in minutes
  endTime: number; // in minutes
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({ selectedSlots, onSlotSelection, onNext, onBack, performanceType }) => {
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Define time sections
  const timeSections: TimeSection[] = [
    { title: 'Morning', startTime: 9 * 60, endTime: 12 * 60 }, // 9 AM to 12 PM
    { title: 'Afternoon', startTime: 12 * 60, endTime: 17 * 60 }, // 12 PM to 5 PM
    { title: 'Evening', startTime: 17 * 60, endTime: 20 * 60 }, // 5 PM to 8 PM
  ];

  useEffect(() => {
    const eventDate = getEventDate();
    
    // Initialize slots if they don't exist
    initializeSlotsForDate(eventDate);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToSlots(eventDate, (updatedSlots) => {
      // Sort the slots by time of day
      const sortedSlots = sortTimeSlots(updatedSlots);
      setSlots(sortedSlots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSlotClick = (timeSlot: string) => {
    if (slots[timeSlot] !== 'available') return;

    let newSelectedSlots: string[];

    if (selectedSlots.includes(timeSlot)) {
      // Remove slot
      newSelectedSlots = selectedSlots.filter(slot => slot !== timeSlot);
    } else {
      // Add slot - ensure it's continuous with existing selection
      if (selectedSlots.length === 0) {
        // First slot selection
        newSelectedSlots = [timeSlot];
      } else {
        // Check if the new slot is adjacent to any existing slot
        const isAdjacent = selectedSlots.some(slot => isAdjacentSlot(slot, timeSlot));
        
        if (isAdjacent) {
          // Add to existing continuous selection
          newSelectedSlots = [...selectedSlots, timeSlot];
          // Sort by time to maintain order
          newSelectedSlots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
        } else {
          // Replace selection with new slot (not continuous)
          newSelectedSlots = [timeSlot];
        }
      }
    }

    onSlotSelection(newSelectedSlots);
  };

  const getSlotStatus = (timeSlot: string) => {
    if (selectedSlots.includes(timeSlot)) {
      return 'selected';
    }
    return slots[timeSlot] || 'available';
  };

  const getSlotsForSection = (section: TimeSection) => {
    return Object.keys(slots).filter(timeSlot => {
      const minutes = timeToMinutes(timeSlot);
      return minutes >= section.startTime && minutes < section.endTime;
    });
  };

  const renderTimeSection = (section: TimeSection) => {
    const sectionSlots = getSlotsForSection(section);
    
    if (sectionSlots.length === 0) {
      return null;
    }

    return (
      <div key={section.title} className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
          {section.title} ({sectionSlots.length} slots available)
        </h4>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {sectionSlots.map((timeSlot) => {
            const status = getSlotStatus(timeSlot);
            const tier = getPricingTier(timeSlot);
            const price = getPriceForSlot(timeSlot, performanceType);
            const slotColor = getSlotColor(timeSlot);
            const borderColor = getSlotBorderColor(timeSlot);
            const isTimePricingEnabled = eventConfig.timePricing?.enabled;
            
            // Get tier display name
            const tierDisplayName = tier && eventConfig.timePricing?.timeRanges[tier]?.displayName;
            
            return (
              <div key={timeSlot} className="relative group">
                <button
                  onClick={() => handleSlotClick(timeSlot)}
                  disabled={slots[timeSlot] === 'booked'}
                  className={`
                    w-full p-2 sm:p-3 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all duration-200 relative
                    ${status === 'available' 
                      ? 'text-gray-700 hover:border-blue-500 hover:bg-blue-50' 
                      : status === 'selected'
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  style={{
                    backgroundColor: status === 'available' && isTimePricingEnabled && slotColor !== 'transparent'
                      ? slotColor
                      : status === 'available' 
                      ? 'white'
                      : undefined,
                    borderColor: status === 'available' && isTimePricingEnabled && borderColor !== 'transparent'
                      ? borderColor
                      : status === 'selected'
                      ? '#3B82F6' // blue-500
                      : undefined
                  }}
                  title={isTimePricingEnabled && tier && tierDisplayName ? `${tierDisplayName} - ₹${price}` : undefined}
                >
                  <div className="text-center">
                    <div>{timeSlot}</div>
                  </div>
                </button>
                
                {/* Tooltip */}
                {isTimePricingEnabled && tier && tierDisplayName && status !== 'booked' && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    {tierDisplayName}: ₹{price}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleNext = () => {
    if (selectedSlots.length > 0) {
      onNext();
    }
  };

  const renderPricingLegend = () => {
    const pricingInfo = getPricingTierInfo();
    if (!pricingInfo) return null;

    // Get the price for the current performance type
    const getPriceForType = (pricing: any) => {
      switch (performanceType) {
        case 'solo':
          return pricing.solo;
        case 'duet':
          return pricing.duet;
        case 'group':
          return pricing.group;
        default:
          return 0;
      }
    };

    // Get display name for performance type
    const getTypeDisplayName = () => {
      switch (performanceType) {
        case 'solo':
          return 'Solo';
        case 'duet':
          return 'Duet';
        case 'group':
          return 'Group';
        default:
          return 'Performance';
      }
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 mb-3">
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <span className="text-xs font-medium text-gray-700 mr-2">{getTypeDisplayName()}:</span>
          {Object.entries(pricingInfo).map(([tier, info]) => (
            <div 
              key={tier}
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs"
              style={{ 
                backgroundColor: info.pricing.color,
                borderColor: info.pricing.borderColor
              }}
            >
              <span className="font-medium text-gray-800">{info.name}</span>
              <span className="font-bold text-gray-800">₹{getPriceForType(info.pricing)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header without Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Select Time Slots</h3>
          <p className="text-sm text-gray-600 mt-1">
            Click on available slots to select them. You can select multiple continuous slots.
          </p>
        </div>
      </div>
      
      {/* Pricing Legend */}
      {renderPricingLegend()}
      
      {/* Time Sections */}
      <div className="space-y-6">
        {timeSections.map(renderTimeSection)}
      </div>
      
      {/* Selected Slots Summary */}
      {selectedSlots.length > 0 && (
        <div className="mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">
            Selected Continuous Slots ({selectedSlots.length})
          </h4>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {selectedSlots.map((slot, index) => (
              <span
                key={index}
                className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium"
              >
                {slot}
              </span>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-blue-600 mt-2">
            Total: {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Selection Rules</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• You can select multiple continuous slots (e.g., 9:00 AM, 9:10 AM, 9:20 AM)</li>
          <li>• Slots must be adjacent to each other</li>
          <li>• Click a selected slot again to deselect it</li>
          <li>• Selecting a non-adjacent slot will replace your current selection</li>
          <li>• Booked slots are grayed out and unavailable</li>
        </ul>
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm w-full sm:w-auto"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={selectedSlots.length === 0}
          className={`
            px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto
            ${selectedSlots.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {selectedSlots.length > 0 
            ? `Continue with ${selectedSlots.length} slot${selectedSlots.length !== 1 ? 's' : ''}`
            : 'Select at least one slot'
          }
        </button>
      </div>
    </div>
  );
};

export default TimeSlotSelector; 