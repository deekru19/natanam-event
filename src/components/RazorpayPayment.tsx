import React, { useState } from 'react';
import { eventConfig } from '../config/eventConfig';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentProps {
  selectedSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentFailure: (error: any) => void;
  onBack: () => void;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  selectedSlots,
  performanceType,
  participantDetails,
  onPaymentSuccess,
  onPaymentFailure,
  onBack
}) => {
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
        const participantNames = participantDetails.participantNames || '';
        if (participantNames.trim()) {
          const participants = participantNames.split(/[,\n]/).filter((name: string) => name.trim()).length;
          return Math.max(participants, 1);
        }
        return 3;
      default:
        return 1;
    }
  };

  const participantCount = getParticipantCount();
  const totalAmount = selectedSlots.length * selectedType.pricePerPerson * participantCount;

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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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
      
      // Create order on backend with auto-capture - CRITICAL for auto-capture to work
      console.log('🚀 Creating Razorpay order for amount:', totalAmount * 100, 'paise');
      let orderId: string | undefined;

      // Create order function
      const createOrder = async (url: string) => {
        try {
          console.log('🌐 Calling Firebase Function at:', url);
          
          const orderResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: totalAmount * 100,
              currency: 'INR',
              notes: {
                performance_type: performanceType,
                time_slots: selectedSlots.join(', '),
                participant_count: participantCount.toString(),
              },
            }),
          });
          
          console.log('📡 Order creation response status:', orderResp.status);
          console.log('📡 Order creation response headers:', Object.fromEntries(orderResp.headers.entries()));
          
          if (orderResp.ok) {
            const data = await orderResp.json();
            console.log('✅ Order created successfully:', data);
            return data?.order?.id;
          } else {
            const errorText = await orderResp.text();
            console.error('❌ Order creation failed with status:', orderResp.status);
            console.error('❌ Order creation error response:', errorText);
            throw new Error(`Order creation failed: ${orderResp.status} - ${errorText}`);
          }
        } catch (error: any) {
          console.error('❌ Order creation failed:', error);
          throw error;
        }
      };

      // Create order using direct Firebase Function URL
      // This approach works reliably in both local development and production
      // No more relative URL fallback needed - direct function calls work everywhere
      try {
        const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
        if (!projectId) {
          throw new Error('Firebase Project ID not configured. Please check environment variables.');
        }
        
        const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/createRazorpayOrder`;
        console.log('🌐 Creating order via Firebase Function:', functionUrl);
        
        orderId = await createOrder(functionUrl);
        console.log('✅ Order created successfully via Firebase Function');
      } catch (orderError: any) {
        console.error('💥 CRITICAL: Order creation failed:', orderError.message);
        
        // Stop payment process - order creation is required for auto-capture
        setError(`Failed to create payment order: ${orderError.message}. Please try again or contact support.`);
        setLoading(false);
        return; // Stop payment process - don't proceed without order
      }

      if (!orderId) {
        const errorMsg = 'Order ID is missing after successful order creation';
        console.error('💥 CRITICAL:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log('🎬 Opening Razorpay payment modal with order ID:', orderId);

      const options: any = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_your_key_here', // Replace with your Razorpay key
        amount: totalAmount * 100, // Amount in paise
        currency: 'INR',
        name: eventConfig.eventName,
        description: `${selectedType.name} Performance Registration`,
        image: '/logo192.png', // Your logo
        order_id: orderId, // ✅ ALWAYS use order ID - required for auto-capture
        handler: function (response: any) {
          console.log('🎉 Payment Success:', response);
          onPaymentSuccess({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            amount: totalAmount,
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
            // Don't treat modal dismissal as failure
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.log('❌ Payment Failed:', response);
        onPaymentFailure({
          error: response.error,
          reason: response.error.reason,
          description: response.error.description
        });
      });

      razorpay.open();
      // Popup opened, reset loading state
      setLoading(false);
      
    } catch (err: any) {
      console.error('💥 Payment initialization failed:', err);
      console.error('💥 Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Complete Payment</h3>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="font-medium text-gray-700 mb-3">Payment Summary</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Performance Type:</span>
            <span className="font-medium">{selectedType.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Participant(s):</span>
            <span className="font-medium">{participantCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time Slots:</span>
            <span className="font-medium">{selectedSlots.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price per person per slot:</span>
            <span className="font-medium">₹{selectedType.pricePerPerson}</span>
          </div>
          
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              ₹{selectedType.pricePerPerson} × {participantCount} × {selectedSlots.length}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Time Slots */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Selected Time Slots</h4>
        <div className="space-y-1">
          {selectedSlots.map((slot, index) => (
            <p key={index} className="text-sm text-blue-700">• {slot}</p>
          ))}
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">Secure Payment</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Payment is processed securely through Razorpay</li>
          <li>• You can pay using UPI, Cards, Net Banking, or Wallets</li>
          <li>• Your booking will be confirmed instantly upon successful payment</li>
          <li>• You will receive a confirmation email after payment</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm w-full sm:w-auto"
          disabled={loading}
        >
          ← Back
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium w-full sm:w-auto"
        >
          {loading ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

export default RazorpayPayment;
