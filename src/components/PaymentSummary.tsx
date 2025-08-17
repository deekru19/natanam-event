import React, { useState } from 'react';
import { eventConfig } from '../config/eventConfig';

interface PaymentSummaryProps {
  selectedSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  onBack: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentFailure: (errorData: any) => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  selectedSlots,
  performanceType,
  participantDetails,
  onBack,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  // All hooks must be called at the top level, before any conditional returns
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const selectedType = eventConfig.performanceTypes.find(type => type.id === performanceType);
  
  if (!selectedType) {
    return <div>Invalid performance type.</div>;
  }

  const getParticipantCount = () => {
    switch (performanceType) {
      case 'solo':
        return 1;
      case 'duet':
        return 2;
      case 'group':
        // Count participants from the textarea (assuming comma or newline separated)
        const participantNames = participantDetails.participantNames || '';
        if (participantNames.trim()) {
          // Split by comma or newline and count non-empty entries
          const participants = participantNames.split(/[,\n]/).filter((name: string) => name.trim()).length;
          return Math.max(participants, 1); // At least 1 participant
        }
        return 3; // Default group size
      default:
        return 1;
    }
  };

  const participantCount = getParticipantCount();
  const totalCost = selectedSlots.length * selectedType.pricePerPerson * participantCount;

  const getParticipantDisplayName = () => {
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

  // Payment functions
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getParticipantName = () => {
    switch (performanceType) {
      case 'solo':
        return participantDetails.fullName || 'N/A';
      case 'duet':
        return participantDetails.participant1Name || 'N/A';
      case 'group':
        const participantNames = participantDetails.participantNames || '';
        if (participantNames.trim()) {
          const participants = participantNames.split(/[,\n]/).filter((name: string) => name.trim());
          return participants[0] || 'N/A';
        }
        return 'N/A';
      default:
        return 'N/A';
    }
  };

  const getContactInfo = () => {
    const phone = participantDetails.phoneNumber || participantDetails.participant1Phone || participantDetails.representativePhone || '';
    const email = participantDetails.email || '';
    return { phone, email };
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      
      if (!isScriptLoaded) {
        throw new Error('Failed to load Razorpay. Please check your internet connection.');
      }

      const { phone, email } = getContactInfo();
      
      // Create order using direct Firebase Function URL
      const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('Firebase Project ID not configured. Please check environment variables.');
      }
      
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/createRazorpayOrder`;
      console.log('🌐 Creating order via Firebase Function:', functionUrl);
      
      const orderResp = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalCost * 100,
          currency: 'INR',
          notes: {
            performance_type: performanceType,
            time_slots: selectedSlots.join(', '),
            participant_count: participantCount.toString(),
          },
        }),
      });
      
      if (!orderResp.ok) {
        const errorText = await orderResp.text();
        throw new Error(`Order creation failed: ${orderResp.status} - ${errorText}`);
      }
      
      const data = await orderResp.json();
      const orderId = data?.order?.id;
      
      if (!orderId) {
        throw new Error('Order created but no order ID returned from backend');
      }
      
      console.log('✅ Order created successfully:', orderId);

      const options: any = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_your_key_here',
        amount: totalCost * 100,
        currency: 'INR',
        name: 'Natanam Dance Event',
        description: `${selectedType.name} Performance Registration`,
        image: '/logo192.png',
        order_id: orderId,
        handler: function (response: any) {
          console.log('🎉 Payment Success:', response);
          onPaymentSuccess({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            amount: totalCost,
            currency: 'INR'
          });
        },
        prefill: {
          name: getParticipantName(),
          email: email,
          contact: phone
        },
        notes: {
          performance_type: performanceType,
          time_slots: selectedSlots.join(', '),
          participant_count: participantCount.toString()
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.log('❌ Payment Failed:', response);
        onPaymentFailure({
          error: response.error,
          reason: response.error.reason,
          description: response.error.description
        });
      });

      razorpay.open();
      setLoading(false);
      
    } catch (err: any) {
      console.error('💥 Payment initialization failed:', err);
      setError(err.message || 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Consistent Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            ← Back
          </button>
          <h3 className="text-xl font-bold text-gray-800">Payment Summary</h3>
        </div>
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
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Price per person:</span>
              <span>₹{selectedType.pricePerPerson}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Number of participants:</span>
              <span>{participantCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Number of slots:</span>
              <span>{selectedSlots.length}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center text-base font-medium">
                <span>Total Amount:</span>
                <span className="text-slate-700">₹{totalCost.toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ₹{selectedType.pricePerPerson} × {participantCount} person{participantCount !== 1 ? 's' : ''} × {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Payment Instructions</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Please complete the payment using UPI or any preferred method</li>
          <li>• Amount to pay: ₹{totalCost.toLocaleString()}</li>
          <li>• You can optionally upload a screenshot of your payment proof</li>
          <li>• Your booking will be confirmed after payment verification</li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Payment Button */}
      <div className="flex justify-end">
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`
            px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            ${loading 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
            }
          `}
        >
          {loading ? 'Processing...' : `Pay ₹${totalCost.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

export default PaymentSummary; 