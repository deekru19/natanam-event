import React, { useState, useEffect } from 'react';
import { checkPaymentStatus, listenToBookingStatus, cleanupFailedBooking } from '../services/firebaseService';
import { eventConfig } from '../config/eventConfig';

interface PaymentStatusCheckerProps {
  paymentData: any;
  selectedSlots: string[];
  performanceType: string;
  participantDetails: Record<string, any>;
  onStatusConfirmed: () => void;
  onStatusFailed: (reason?: string) => void;
}

const PaymentStatusChecker: React.FC<PaymentStatusCheckerProps> = ({
  paymentData,
  selectedSlots,
  performanceType,
  participantDetails,
  onStatusConfirmed,
  onStatusFailed
}) => {
  const [checking, setChecking] = useState(true);
  const [countdown, setCountdown] = useState(30); // 30 seconds timeout
  const [status, setStatus] = useState<'checking' | 'confirmed' | 'failed'>('checking');

  useEffect(() => {
    if (!paymentData?.paymentId) {
      onStatusFailed('Invalid payment data');
      return;
    }

    // Start countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setChecking(false);
          // On timeout, cleanup any pending booking and free slots
          cleanupFailedBooking(paymentData.paymentId).finally(() => {
            onStatusFailed('Webhook timeout - payment status unclear');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen to booking status changes in real-time
    const unsubscribe = listenToBookingStatus(
      paymentData.paymentId,
      (bookingStatus, booking) => {
        console.log('Booking status update:', bookingStatus, booking);
        
        if (bookingStatus === 'confirmed') {
          clearInterval(countdownInterval);
          setStatus('confirmed');
          setChecking(false);
          onStatusConfirmed();
        } else if (bookingStatus === 'cancelled') {
          clearInterval(countdownInterval);
          setStatus('failed');
          setChecking(false);
          const reason = booking?.originalBookingData?.paymentData?.errorReason || 'Payment was declined or failed';
          onStatusFailed(reason);
        }
      }
    );

    // Also check status immediately and every 3 seconds as fallback
    const statusCheckInterval = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(paymentData.paymentId);
        console.log('Payment status check result:', result);
        
        if (result.status === 'confirmed') {
          clearInterval(countdownInterval);
          clearInterval(statusCheckInterval);
          setStatus('confirmed');
          setChecking(false);
          onStatusConfirmed();
        } else if (result.status === 'cancelled') {
          clearInterval(countdownInterval);
          clearInterval(statusCheckInterval);
          setStatus('failed');
          setChecking(false);
          const reason = result.booking?.originalBookingData?.paymentData?.errorReason || 'Payment was declined or failed';
          onStatusFailed(reason);
        } else if (result.status === 'not_found') {
          // If no booking is located for this payment, treat as failure and cleanup defensively
          clearInterval(countdownInterval);
          clearInterval(statusCheckInterval);
          setStatus('failed');
          setChecking(false);
          await cleanupFailedBooking(paymentData.paymentId);
          onStatusFailed('Payment could not be verified. Please retry.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);

    // Cleanup function
    return () => {
      clearInterval(countdownInterval);
      clearInterval(statusCheckInterval);
      unsubscribe();
    };
  }, [paymentData?.paymentId, onStatusConfirmed, onStatusFailed]);

  const selectedType = eventConfig.performanceTypes.find(type => type.id === performanceType);

  if (!checking) {
    return null; // Component will be unmounted by parent
  }

  return (
    <div className="text-center space-y-6">
      {/* Processing Icon */}
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* Processing Message */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Processing Payment...</h3>
        <p className="text-gray-600 mb-4">
          Please wait while we confirm your payment with our payment provider.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 inline-block">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Payment ID:</span> {paymentData.paymentId}
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-yellow-700">
          <span className="font-medium">Timeout in {countdown} seconds</span>
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          We're waiting for payment confirmation from Razorpay
        </p>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
        <h4 className="font-semibold text-gray-800 mb-4 text-center">Payment Details</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Performance:</span>
            <span className="font-medium">{selectedType?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time Slots:</span>
            <span className="font-medium">{selectedSlots.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="font-bold text-green-600">₹{paymentData.amount?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-blue-800 mb-2">What's happening?</h4>
        <ul className="text-sm text-blue-700 space-y-1 text-left">
          <li>• Your payment has been submitted to Razorpay</li>
          <li>• We're waiting for payment confirmation</li>
          <li>• This usually takes 5-10 seconds</li>
          <li>• Please don't close this page</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentStatusChecker;
