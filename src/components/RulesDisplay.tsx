import React, { useEffect, useState } from 'react';
import { eventConfig } from '../config/eventConfig';

interface RulesDisplayProps {
  onContinue: () => void;
  onBack: () => void;
}

const RulesDisplay: React.FC<RulesDisplayProps> = ({ onContinue, onBack }) => {
  const [isScrolling, setIsScrolling] = useState(eventConfig.waitForRulesCompletion);

  useEffect(() => {
    // Auto-scroll animation - only if waitForRulesCompletion is enabled
    if (!eventConfig.waitForRulesCompletion) {
      setIsScrolling(false);
      return;
    }

    const scrollContainer = document.getElementById('rules-scroll-container');
    if (!scrollContainer) return;

    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setIsScrolling(false);
      return;
    }

    let currentScroll = 0;
    const scrollSpeed = 30; // pixels per second
    const interval = 50; // milliseconds
    const scrollIncrement = (scrollSpeed * interval) / 1000;

    const scrollTimer = setInterval(() => {
      currentScroll += scrollIncrement;
      if (currentScroll >= maxScroll) {
        currentScroll = maxScroll;
        setIsScrolling(false);
        clearInterval(scrollTimer);
      }
      scrollContainer.scrollTop = currentScroll;
    }, interval);

    return () => clearInterval(scrollTimer);
  }, []);

  const formatRulesText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      // Check if it's a title/header (contains "NATANAM FOUNDATION" or "Rules and Regulations")
      if (line.includes('NATANAM FOUNDATION') || line.includes('SHYAMOTSAVA')) {
        return (
          <h1 key={index} className="text-xl sm:text-2xl font-bold text-center text-rose-600 mb-4 font-heading">
            {line}
          </h1>
        );
      }
      
      if (line.includes('Rules and Regulations')) {
        return (
          <h2 key={index} className="text-lg sm:text-xl font-bold text-center text-slate-800 mb-6 font-heading">
            {line}
          </h2>
        );
      }
      
      // Check if it's venue/date/time info
      if (line.includes('Venue') || line.includes('Date') || line.includes('Time')) {
        return (
          <p key={index} className="text-center text-slate-700 font-medium mb-2">
            {line}
          </p>
        );
      }
      
      // Check if it's a numbered rule
      if (/^\d+\./.test(line.trim())) {
        return (
          <p key={index} className="text-slate-800 mb-3 leading-relaxed font-medium">
            <span className="font-bold text-rose-600">{line.match(/^\d+\./)?.[0]}</span>
            {line.replace(/^\d+\./, '')}
          </p>
        );
      }
      
      // Regular text with some formatting
      return (
        <p key={index} className="text-slate-700 mb-2 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-rose-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-orange-600 p-4 sm:p-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-heading">
                Rules & Regulations
              </h2>
              <p className="text-rose-100 text-sm sm:text-base">
                Please read the following rules carefully
              </p>
            </div>
          </div>

          {/* Rules Content with Auto-scroll */}
          <div className="relative">
            <div
              id="rules-scroll-container"
              className={`h-96 sm:h-[500px] p-6 sm:p-8 text-sm sm:text-base ${
                isScrolling ? 'overflow-hidden' : 'overflow-y-auto'
              }`}
              style={{
                scrollBehavior: isScrolling ? 'auto' : 'smooth'
              }}
            >
              <div className="space-y-1">
                {formatRulesText(eventConfig.rulesAndRegulations)}
              </div>
            </div>

            {/* Scroll indicator */}
            {isScrolling && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent h-20 flex items-end justify-center pb-4">
                <div className="flex items-center space-x-2 text-slate-500">
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-xs ml-2">Auto-scrolling...</span>
                </div>
              </div>
            )}
            
            {/* Manual scroll indicator */}
            {!isScrolling && (
              <div className="absolute bottom-0 right-4 text-slate-400 text-xs flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                <span>Scroll to read more</span>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="bg-slate-50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
              >
                ← Back
              </button>
              
              <div className="flex items-center space-x-4">
                
                <button
                  onClick={onContinue}
                  disabled={isScrolling}
                  className={`
                    px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg w-full sm:w-auto
                    ${isScrolling 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-rose-600 to-orange-600 text-white hover:from-rose-700 hover:to-orange-700 hover:shadow-xl'
                    }
                  `}
                >
                  {isScrolling ? 'Please wait...' : 'I have read the rules - Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesDisplay;
