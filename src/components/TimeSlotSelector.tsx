import React, { useState, useEffect } from 'react';
import { subscribeToSlots, initializeSlotsForDate } from '../services/firebaseService';
import { getEventDate, isAdjacentSlot, sortTimeSlots, timeToMinutes } from '../utils/timeUtils';

interface TimeSlotSelectorProps {
  selectedSlots: string[];
  onSlotSelection: (slots: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TimeSection {
  title: string;
  startTime: number; // in minutes
  endTime: number; // in minutes
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({ selectedSlots, onSlotSelection, onNext, onBack }) => {
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
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {sectionSlots.map((timeSlot) => {
            const status = getSlotStatus(timeSlot);
            
            return (
              <button
                key={timeSlot}
                onClick={() => handleSlotClick(timeSlot)}
                disabled={slots[timeSlot] === 'booked'}
                className={`
                  p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200
                  ${status === 'available' 
                    ? 'border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:bg-blue-50' 
                    : status === 'selected'
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {timeSlot}
              </button>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consistent Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            ← Back
          </button>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Select Time Slots</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click on available slots to select them. You can select multiple continuous slots.
            </p>
          </div>
        </div>
      </div>
      
      {/* Time Sections */}
      <div className="space-y-6">
        {timeSections.map(renderTimeSection)}
      </div>
      
      {/* Selected Slots Summary */}
      {selectedSlots.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">
            Selected Continuous Slots ({selectedSlots.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedSlots.map((slot, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {slot}
              </span>
            ))}
          </div>
          <p className="text-sm text-blue-600 mt-2">
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

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={selectedSlots.length === 0}
          className={`
            px-6 py-2 rounded-md font-medium transition-colors
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