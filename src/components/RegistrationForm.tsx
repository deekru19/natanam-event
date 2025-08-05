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
        <div key={field.id} className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300
              ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'}
            `}
          />
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.id} className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'Yes'}
                onChange={(e) => handleInputChange(field.id, e.target.checked ? 'Yes' : '')}
                className="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 transition-all duration-200"
              />
              <span className="text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'No'}
                onChange={(e) => handleInputChange(field.id, e.target.checked ? 'No' : '')}
                className="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 transition-all duration-200"
              />
              <span className="text-sm font-medium text-gray-700">No</span>
            </label>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={field.type}
          value={value}
          onChange={(e) => handleInputChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className={`
            w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300
            ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'}
          `}
        />
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {selectedType.name} Registration Form
          </h3>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mt-2"></div>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-purple-600 hover:text-purple-800 text-sm font-medium bg-purple-50 hover:bg-purple-100 rounded-full transition-all duration-300 transform hover:scale-105"
        >
          ← Back
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Participant Information Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">👥</span>
            </div>
            <h4 className="text-xl font-bold text-gray-800">
              {performanceType === 'solo' ? 'Participant Information' : 
               performanceType === 'duet' ? 'Participants Information' : 
               'Group Information'}
            </h4>
          </div>
          <div className="space-y-6">
            {getParticipantFields().map(renderField)}
            {getEmailField() && renderField(getEmailField()!)}
          </div>
        </div>

        {/* Common Information Section */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">🎭</span>
            </div>
            <h4 className="text-xl font-bold text-gray-800">
              Event Information
            </h4>
          </div>
          <div className="space-y-6">
            {getCommonFields().map(renderField)}
          </div>
        </div>
        
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm; 