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
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
          Select Performance Type
        </h3>
        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full mb-4"></div>
        <p className="text-lg text-gray-700 font-medium">
          Choose the type of performance you want to register for.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {eventConfig.performanceTypes.map((type, index) => (
          <button
            key={type.id}
            onClick={() => onTypeSelection(type.id)}
            className={`
              p-8 rounded-2xl border-2 transition-all duration-500 text-left transform hover:scale-105 hover:shadow-2xl
              ${selectedType === type.id
                ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl scale-105'
                : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-50/50 hover:to-pink-50/50 shadow-lg'
              }
            `}
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
                  ${selectedType === type.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }
                `}>
                  {type.name === 'Solo' ? '👤' : type.name === 'Duet' ? '👥' : '👨‍👩‍👧‍👦'}
                </div>
                <h4 className="text-xl font-bold text-gray-800">{type.name}</h4>
              </div>
              <span className={`
                text-lg font-bold px-3 py-1 rounded-full
                ${selectedType === type.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700'
                }
              `}>
                ₹{type.pricePerSlot}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              {type.formFields.length} field{type.formFields.length !== 1 ? 's' : ''} to fill
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Duration: 10 min</span>
                <span>Per slot</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PerformanceTypeSelector; 