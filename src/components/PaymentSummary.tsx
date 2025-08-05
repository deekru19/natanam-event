import React from 'react';
import { eventConfig } from '../config/eventConfig';

interface PaymentSummaryProps {
  selectedSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  onBack: () => void;
  onProceed: () => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  selectedSlots,
  performanceType,
  participantDetails,
  onBack,
  onProceed
}) => {
  const selectedType = eventConfig.performanceTypes.find(type => type.id === performanceType);
  
  if (!selectedType) {
    return <div>Invalid performance type.</div>;
  }

  const totalCost = selectedSlots.length * selectedType.pricePerSlot;

  const getParticipantDisplayName = () => {
    switch (performanceType) {
      case 'solo':
        return participantDetails.name || 'N/A';
      case 'duet':
        return `${participantDetails.participant1Name || 'N/A'} & ${participantDetails.participant2Name || 'N/A'}`;
      case 'group':
        return participantDetails.groupName || 'N/A';
      default:
        return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Payment Summary</h3>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Performance Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Type:</span> {selectedType.name}</p>
              <p><span className="font-medium">Participant(s):</span> {getParticipantDisplayName()}</p>
              <p><span className="font-medium">Dance Style:</span> {participantDetails.danceStyle || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Time Slots</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Selected:</span> {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}</p>
              <p><span className="font-medium">Times:</span></p>
              <div className="ml-4">
                {selectedSlots.map((slot, index) => (
                  <p key={index} className="text-gray-600">• {slot}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount:</span>
            <span className="text-blue-600">₹{totalCost}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            ₹{selectedType.pricePerSlot} × {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Payment Instructions</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Please complete the payment using UPI or any preferred method</li>
          <li>• Amount to pay: ₹{totalCost}</li>
          <li>• You can optionally upload a screenshot of your payment proof</li>
          <li>• Your booking will be confirmed after payment verification</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onProceed}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default PaymentSummary; 