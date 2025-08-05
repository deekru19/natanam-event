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

  const handleTypeSelection = (type: string) => {
    setPerformanceType(type);
    setCurrentStep('form');
  };

  const handleFormSubmit = (formData: Record<string, any>) => {
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dance Event Admin</h1>
              <div className="space-x-2">
                <button
                  onClick={() => setIsFirebaseTestMode(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Test Firebase
                </button>
                <button
                  onClick={() => setIsAdminMode(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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

  // Registration Form View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <h1 className="text-3xl font-bold text-gray-900">Dance Event Registration</h1>
            <button
              onClick={() => setIsAdminMode(true)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Admin
            </button>
          </div>
          <p className="text-gray-600">
            Register for the quarterly dance event on {new Date(eventConfig.eventDate).toLocaleDateString()}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {['type', 'form', 'slots', 'payment', 'upload'].map((step, index) => {
              const stepNames = ['Choose Type', 'Fill Form', 'Select Slots', 'Payment', 'Upload'];
              const isActive = currentStep === step;
              const isCompleted = ['type', 'form', 'slots', 'payment', 'upload'].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}
                  `}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < 4 && (
                    <div className={`
                      w-12 h-1 mx-2
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && renderStep()}
        </div>
      </div>
    </div>
  );
};

export default App;
