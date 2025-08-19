import React from 'react';
import { eventConfig } from '../config/eventConfig';

interface PaymentSuccessProps {
  selectedSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  paymentData?: any;
  onNewBooking: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  selectedSlots,
  performanceType,
  participantDetails,
  paymentData,
  onNewBooking
}) => {
  const selectedType = eventConfig.performanceTypes.find(type => type.id === performanceType);

  const getParticipantName = () => {
    switch (performanceType) {
      case 'solo':
        return participantDetails.fullName || 'N/A';
      case 'duet':
        return `${participantDetails.participant1Name || 'N/A'} & ${participantDetails.participant2Name || 'N/A'}`;
      case 'group':
        const participantNames = participantDetails.participantNames || '';
        if (participantNames.trim()) {
          const participants = participantNames.split(/[,\n]/).filter((name: string) => name.trim());
          return participants.length > 0 ? participants.join(', ') : 'N/A';
        }
        return 'N/A';
      default:
        return 'N/A';
    }
  };

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Success Message */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-4">
          Your booking has been confirmed. You will receive a confirmation email shortly.
        </p>
        
        {paymentData?.paymentId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 inline-block">
            <p className="text-sm text-green-700">
              <span className="font-medium">Payment ID:</span> {paymentData.paymentId}
            </p>
          </div>
        )}
      </div>

      {/* Booking Details */}
      <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
        <h4 className="font-semibold text-gray-800 mb-4 text-center">Booking Details</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{new Date(eventConfig.eventDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Performance:</span>
            <span className="font-medium">{selectedType?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Participant(s):</span>
            <span className="font-medium text-right">{getParticipantName()}</span>
          </div>
          <div>
            <span className="text-gray-600">Time Slots:</span>
            <div className="mt-1">
              {selectedSlots.map((slot, index) => (
                <div key={index} className="font-medium text-right">• {slot}</div>
              ))}
            </div>
          </div>
          {paymentData?.amount && (
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-bold text-green-600">₹{paymentData.amount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-blue-800 mb-2">What's Next?</h4>
        <ul className="text-sm text-blue-700 space-y-1 text-left">
          <li>• Please arrive 15 minutes before your first time slot</li>
          <li>• Bring a screenshot of this confirmation for verification</li>
          <li>• Contact us if you have any questions</li>
        </ul>
      </div>

      {/* Action Button */}
      <button
        onClick={onNewBooking}
        className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        Book Another Performance
      </button>
    </div>
  );
};

export default PaymentSuccess;
