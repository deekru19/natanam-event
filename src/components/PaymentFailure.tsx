import React from 'react';

interface PaymentFailureProps {
  error?: any;
  paymentData?: any;
  onRetry: () => void;
  onBack: () => void;
}

const PaymentFailure: React.FC<PaymentFailureProps> = ({
  error,
  paymentData,
  onRetry,
  onBack
}) => {
  const getErrorMessage = () => {
    if (error?.description) {
      return error.description;
    }
    if (error?.reason) {
      return error.reason;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred during payment processing.';
  };

  const getErrorCode = () => {
    if (error?.error?.code) {
      return error.error.code;
    }
    return null;
  };

  return (
    <div className="text-center space-y-6">
      {/* Failure Icon */}
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      {/* Failure Message */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h3>
        <p className="text-gray-600 mb-4">
          We couldn't process your payment. Please try again.
        </p>
      </div>

      {/* Payment ID if available */}
      {paymentData?.paymentId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
          <h4 className="font-medium text-gray-800 mb-2">Payment Reference</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Payment ID:</span> {paymentData.paymentId}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Please save this ID for future reference when contacting support.
          </p>
        </div>
      )}

      {/* Error Details */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
        <p className="text-sm text-red-700">{getErrorMessage()}</p>
        {getErrorCode() && (
          <p className="text-xs text-red-600 mt-2">
            Error Code: {getErrorCode()}
          </p>
        )}
      </div>

      {/* Common Issues */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-yellow-800 mb-2">Common Issues</h4>
        <ul className="text-sm text-yellow-700 space-y-1 text-left">
          <li>• Insufficient balance in your account</li>
          <li>• Incorrect card details or expired card</li>
          <li>• Network connectivity issues</li>
          <li>• Payment declined by your bank</li>
          <li>• Daily transaction limit exceeded</li>
        </ul>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-blue-800 mb-2">What to do next?</h4>
        <ul className="text-sm text-blue-700 space-y-1 text-left">
          <li>• Check your payment method and try again</li>
          <li>• Ensure you have sufficient balance</li>
          <li>• Try a different payment method</li>
          <li>• Contact your bank if the issue persists</li>
          <li>• Contact us for assistance if needed</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
        >
          Go Back
        </button>
        <button
          onClick={onRetry}
          className="px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default PaymentFailure;
