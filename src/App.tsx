import React, { useState } from 'react';
import TimeSlotSelector from './components/TimeSlotSelector';
import PerformanceTypeSelector from './components/PerformanceTypeSelector';
import RegistrationForm from './components/RegistrationForm';
import PaymentSummary from './components/PaymentSummary';
import ScreenshotUpload from './components/ScreenshotUpload';
import AdminPanel from './components/AdminPanel';
import FirebaseTest from './components/FirebaseTest';
import { createBooking, uploadScreenshot, updateSlotStatus, validateSlotsAvailable } from './services/firebaseService';
import { getEventDate } from './utils/timeUtils';
import { eventConfig } from './config/eventConfig';

type Step = 'type' | 'form' | 'slots' | 'payment' | 'upload' | 'success';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [performanceType, setPerformanceType] = useState<string>('');
  const [participantDetails, setParticipantDetails] = useState<Record<string, any>>({});
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isFirebaseTestMode, setIsFirebaseTestMode] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const handleTypeSelection = (type: string) => {
    setPerformanceType(type);
    setCurrentStep('form');
  };

  const handleFormSubmit = (formData: Record<string, any>) => {
    console.log('📝 Form data received:', formData);
    console.log('📝 Form data keys:', Object.keys(formData));
    setParticipantDetails(formData);
    setCurrentStep('slots');
  };

  const handleSlotSelection = (slots: string[]) => {
    setSelectedSlots(slots);
  };

  const handleSlotsNext = () => {
    if (selectedSlots.length > 0) {
      setCurrentStep('payment');
    }
  };

  const handlePaymentProceed = () => {
    setCurrentStep('upload');
  };

  const handleScreenshotUpload = async (file: File) => {
    try {
      setLoading(true);
      const eventDate = getEventDate();
      const url = await uploadScreenshot(file, eventDate, selectedSlots[0]);
      setScreenshotUrl(url);
      await handleBookingSubmission();
    } catch (err) {
      setError('Failed to upload screenshot. Please try again.');
      setLoading(false);
    }
  };

  const handleScreenshotSkip = async () => {
    await handleBookingSubmission();
  };

  const handleBookingSubmission = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate slots are still available
      const eventDate = getEventDate();
      console.log('🔍 Validating slots for date:', eventDate);
      console.log('🔍 Selected slots:', selectedSlots);
      
      const slotsAvailable = await validateSlotsAvailable(eventDate, selectedSlots);
      
      if (!slotsAvailable) {
        setError('Some selected slots are no longer available. Please go back and select different slots.');
        setCurrentStep('slots');
        setLoading(false);
        return;
      }

      console.log('✅ Slots validation passed');

      // Create booking
      const booking = {
        date: eventDate,
        timeSlots: selectedSlots,
        performanceType,
        participantDetails,
        screenshotUrl
      };

      console.log('📝 Creating booking with data:', booking);
      console.log('📝 Performance type:', performanceType);
      console.log('📝 Participant details:', participantDetails);
      console.log('📝 Participant details keys:', Object.keys(participantDetails));
      console.log('📝 Participant details values:', Object.values(participantDetails));

      const bookingId = await createBooking(booking);
      console.log('✅ Booking created successfully with ID:', bookingId);

      // Update slot statuses
      console.log('🔄 Updating slot statuses...');
      for (const slot of selectedSlots) {
        console.log('🔄 Updating slot:', slot);
        await updateSlotStatus(eventDate, slot, 'booked');
      }
      console.log('✅ All slot statuses updated');

      setCurrentStep('success');
    } catch (err: any) {
      console.error('❌ Booking creation failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create booking. Please try again.';
      
      if (err.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check Firebase security rules.';
      } else if (err.code === 'unavailable') {
        errorMessage = 'Firebase service unavailable. Please check your internet connection.';
      } else if (err.code === 'invalid-argument') {
        errorMessage = 'Invalid booking data. Please check all required fields.';
      } else if (err.message) {
        errorMessage = `Booking failed: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'form':
        setCurrentStep('type');
        break;
      case 'slots':
        setCurrentStep('form');
        break;
      case 'payment':
        setCurrentStep('slots');
        break;
      case 'upload':
        setCurrentStep('payment');
        break;
    }
  };

  const resetForm = () => {
    setSelectedSlots([]);
    setPerformanceType('');
    setParticipantDetails({});
    setScreenshotUrl('');
    setError('');
    setCurrentStep('type');
  };

  const handleAdminClick = () => {
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123') {
      setIsAdminMode(true);
      setShowPasswordModal(false);
      setPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'type':
        return (
          <PerformanceTypeSelector
            selectedType={performanceType}
            onTypeSelection={handleTypeSelection}
          />
        );
      
      case 'form':
        return (
          <RegistrationForm
            performanceType={performanceType}
            onSubmit={handleFormSubmit}
            onBack={handleBack}
          />
        );
      
      case 'slots':
        return (
          <TimeSlotSelector
            selectedSlots={selectedSlots}
            onSlotSelection={handleSlotSelection}
            onNext={handleSlotsNext}
          />
        );
      
      case 'payment':
        return (
          <PaymentSummary
            selectedSlots={selectedSlots}
            performanceType={performanceType}
            participantDetails={participantDetails}
            onBack={handleBack}
            onProceed={handlePaymentProceed}
          />
        );
      
      case 'upload':
        return (
          <ScreenshotUpload
            onUpload={handleScreenshotUpload}
            onSkip={handleScreenshotSkip}
            onBack={handleBack}
          />
        );
      
      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600">
                Your dance performance has been successfully booked. You will receive a confirmation email shortly.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-800 mb-2">Booking Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Date:</span> {new Date(eventConfig.eventDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Time Slots:</span> {selectedSlots.join(', ')}</p>
                <p><span className="font-medium">Performance Type:</span> {eventConfig.performanceTypes.find(t => t.id === performanceType)?.name}</p>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Book Another Performance
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Firebase Test View
  if (isFirebaseTestMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
        {/* Elegant background for Firebase test */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-teal-200/40 to-cyan-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000"></div>
          <div className="absolute bottom-10 left-1/4 w-48 h-48 bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-4000"></div>
          
          {/* Subtle tech pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 relative z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Firebase Connection Test</h1>
              <div className="space-x-2">
                <button
                  onClick={() => setIsFirebaseTestMode(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  ← Back to Admin
                </button>
                <button
                  onClick={() => {
                    setIsFirebaseTestMode(false);
                    setIsAdminMode(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to Registration
                </button>
              </div>
            </div>
          </div>
        </div>
        <FirebaseTest />
      </div>
    );
  }

  // Admin Panel View
  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Elegant background for admin */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-slate-200/40 to-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000"></div>
          <div className="absolute bottom-10 left-1/4 w-48 h-48 bg-gradient-to-br from-indigo-200/40 to-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-4000"></div>
          
          {/* Subtle pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 relative z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
                          <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Dance Event Admin</h1>
                <div className="space-x-2">
                  <button
                    onClick={() => setIsFirebaseTestMode(true)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-sm"
                  >
                    Test Firebase
                  </button>
                  <button
                    onClick={() => setIsAdminMode(false)}
                    className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all duration-300 shadow-sm"
                  >
                    ← Back to Registration
                  </button>
                </div>
              </div>
          </div>
        </div>
        <AdminPanel />
      </div>
    );
  }

  // Password Modal
  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden flex items-center justify-center">
        {/* Elegant background for modal */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-rose-200/30 to-pink-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-orange-200/30 to-yellow-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full mix-blend-multiply filter blur-2xl animate-float animation-delay-4000"></div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/60 max-w-md w-full mx-4 relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent mb-2">
              Admin Access
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full mb-4"></div>
            <p className="text-slate-600">Please enter the admin password to continue</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all duration-300 font-semibold"
              >
                Access Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Registration Form View
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden">
      {/* Elegant background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft floating elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-rose-200/40 to-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute top-40 right-40 w-48 h-48 bg-gradient-to-br from-orange-200/40 to-yellow-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-56 h-56 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-4000"></div>
        
        {/* Subtle decorative lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-300/30 to-transparent"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-300/30 to-transparent"></div>
        
        {/* Delicate sparkles */}
        <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-rose-300/60 rounded-full animate-pulse"></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-orange-300/60 rounded-full animate-pulse animation-delay-150"></div>
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-amber-300/60 rounded-full animate-pulse animation-delay-4000"></div>
        
        {/* Soft texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 via-orange-50/30 to-amber-50/30"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
                Dance Event Registration
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full"></div>
            </div>
            <button
              onClick={handleAdminClick}
              className="px-4 py-2 text-sm bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-full hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Admin
            </button>
          </div>
          <p className="text-slate-700 text-lg font-medium">
            Register for the quarterly dance event on {new Date(eventConfig.eventDate).toLocaleDateString()}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-6">
            {['type', 'form', 'slots', 'payment', 'upload'].map((step, index) => {
              const stepNames = ['Choose Type', 'Fill Form', 'Select Slots', 'Payment', 'Upload'];
              const isActive = currentStep === step;
              const isCompleted = ['type', 'form', 'slots', 'payment', 'upload'].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 transform hover:scale-110
                    ${isActive ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg scale-110' : 
                      isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 
                      'bg-white/80 text-slate-400 border-2 border-slate-200 shadow-md'}
                  `}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < 4 && (
                    <div className={`
                      w-16 h-1 mx-3 rounded-full transition-all duration-500
                      ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-200'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/60">
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center p-12">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-orange-500 rounded-full animate-spin animation-delay-150"></div>
              </div>
            </div>
          )}

          {!loading && renderStep()}
        </div>
      </div>
    </div>
  );
};

export default App;
