import React from 'react';
import { eventConfig, PerformanceType } from '../config/eventConfig';

interface PerformanceTypeSelectorProps {
  selectedType: string;
  onTypeSelection: (type: string) => void;
}

const PerformanceTypeSelector: React.FC<PerformanceTypeSelectorProps> = ({ 
  selectedType, 
  onTypeSelection 
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Select Performance Type</h3>
      <p className="text-sm text-gray-600">
        Choose the type of performance you want to register for.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {eventConfig.performanceTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onTypeSelection(type.id)}
            className={`
              p-6 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedType === type.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">{type.name}</h4>
              <span className="text-sm font-medium text-blue-600">
                ₹{type.pricePerSlot}/slot
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {type.formFields.length} field{type.formFields.length !== 1 ? 's' : ''} to fill
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PerformanceTypeSelector; 