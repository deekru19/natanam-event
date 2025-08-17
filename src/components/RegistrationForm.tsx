import React, { useState } from 'react';
import { eventConfig, PerformanceType } from '../config/eventConfig';

interface RegistrationFormProps {
  performanceType: string;
  onSubmit: (formData: Record<string, any>) => void;
  onBack: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  performanceType, 
  onSubmit, 
  onBack 
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedType = eventConfig.performanceTypes.find(type => type.id === performanceType);

  if (!selectedType) {
    return <div>Invalid performance type selected.</div>;
  }

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Real-time validation
    if (value && value.toString().trim() !== '') {
      const fieldValidation = validateField(fieldId, value.toString().trim());
      setErrors(prev => ({
        ...prev,
        [fieldId]: fieldValidation
      }));
    } else {
      // Clear error when user starts typing
      if (errors[fieldId]) {
        setErrors(prev => ({
          ...prev,
          [fieldId]: ''
        }));
      }
    }
  };

  // Validation functions
  const validateAge = (age: string): string => {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
      return 'Age must be a number';
    }
    if (ageNum < 3 || ageNum > 90) {
      return 'Age must be between 3 and 90';
    }
    return '';
  };

  const validatePhoneNumber = (phone: string): string => {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return 'Phone number must be exactly 10 digits';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) return ''; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateField = (fieldId: string, value: string): string => {
    // Age validation
    if (fieldId === 'age') {
      return validateAge(value);
    }
    
    // Phone number validation
    if (fieldId.includes('phone') || fieldId.includes('Phone')) {
      return validatePhoneNumber(value);
    }
    
    // Email validation
    if (fieldId === 'email') {
      return validateEmail(value);
    }
    
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    selectedType.formFields.forEach(field => {
      const value = formData[field.id] || '';
      
      // Required field validation
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.id] = `${field.label} is required`;
      }
      
      // Specific field validations
      if (value && value.toString().trim() !== '') {
        const fieldValidation = validateField(field.id, value.toString().trim());
        if (fieldValidation) {
          newErrors[field.id] = fieldValidation;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="space-y-2 sm:space-y-3">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`
              w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-300 text-sm sm:text-base
              ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-rose-300'}
            `}
          />
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.id} className="space-y-2 sm:space-y-3">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2 sm:space-y-3">
            <label className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'Yes'}
                onChange={(e) => handleInputChange(field.id, e.target.checked ? 'Yes' : '')}
                className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 border-2 border-slate-300 rounded focus:ring-rose-500 focus:ring-2 transition-all duration-200"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-700">Yes</span>
            </label>
            <label className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'No'}
                onChange={(e) => handleInputChange(field.id, e.target.checked ? 'No' : '')}
                className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 border-2 border-slate-300 rounded focus:ring-rose-500 focus:ring-2 transition-all duration-200"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-700">No</span>
            </label>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2 sm:space-y-3">
        <label className="block text-xs sm:text-sm font-semibold text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={field.type}
          value={value}
          onChange={(e) => handleInputChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className={`
            w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-300 text-sm sm:text-base
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-rose-300'}
          `}
        />
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    );
  };

  const getParticipantFields = () => {
    return selectedType.formFields.filter(field => 
      field.id.includes('participant') || 
      field.id.includes('Phone') || 
      field.id === 'fullName' ||
      field.id === 'phoneNumber' ||
      field.id === 'representativePhone' ||
      field.id === 'participantNames'
    );
  };

  const getCommonFields = () => {
    return selectedType.formFields.filter(field => 
      !field.id.includes('participant') && 
      !field.id.includes('Phone') && 
      field.id !== 'fullName' &&
      field.id !== 'phoneNumber' &&
      field.id !== 'representativePhone' &&
      field.id !== 'participantNames' &&
      field.id !== 'email'
    );
  };

  const getEmailField = () => {
    return selectedType.formFields.find(field => field.id === 'email');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Consistent Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            ← Back
          </button>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent font-heading">
            {selectedType.name} Registration Form
          </h3>
        </div>
        <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"></div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Participant Information Section */}
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-rose-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-bold">👥</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-800 font-heading">
              {performanceType === 'solo' ? 'Participant Information' : 
               performanceType === 'duet' ? 'Participants Information' : 
               'Group Information'}
            </h4>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {getParticipantFields().map(renderField)}
            {getEmailField() && renderField(getEmailField()!)}
          </div>
        </div>

        {/* Common Information Section */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-slate-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-bold">🎭</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-800 font-heading">
              Event Information
            </h4>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {getCommonFields().map(renderField)}
          </div>
        </div>
        
        <div className="flex justify-end pt-4 sm:pt-6">
          <button
            type="submit"
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-full hover:from-rose-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-sm sm:text-base"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm; 