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
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent mb-3 font-heading">
          Select Performance Type
        </h3>
        <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full mb-4"></div>
        <p className="text-sm sm:text-lg text-slate-700 font-medium">
          Choose the type of performance you want to register for.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {eventConfig.performanceTypes.map((type, index) => (
          <button
            key={type.id}
            onClick={() => onTypeSelection(type.id)}
            className={`
              p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl h-48 sm:h-56
              ${selectedType === type.id
                ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-orange-50 shadow-xl scale-105'
                : 'border-slate-200 bg-white/80 backdrop-blur-sm hover:border-rose-300 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-orange-50/50 shadow-lg'
              }
            `}
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6">
              <div className={`
                w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200
                ${selectedType === type.id
                  ? 'ring-4 ring-rose-500 ring-offset-2 shadow-lg'
                  : 'ring-2 ring-slate-200 shadow-md hover:shadow-lg'
                }
                transition-all duration-300
              `}>
                <img 
                  src={`/${type.name.toLowerCase()}.webp`}
                  alt={`${type.name} performance`}
                  className="w-full h-full object-cover rounded-full transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to emoji if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl bg-gradient-to-r from-slate-400 to-slate-500 rounded-full';
                    fallback.textContent = type.name === 'Solo' ? '👤' : type.name === 'Duet' ? '👥' : '👨‍👩‍👧‍👦';
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-slate-800 font-heading">{type.name}</h4>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PerformanceTypeSelector; 