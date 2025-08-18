import React, { useState, useEffect } from 'react';
import { FlatBooking } from '../services/firebaseService';
import { whatsAppService } from '../services/whatsAppService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: FlatBooking[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, bookings }) => {
  const [messageTemplate, setMessageTemplate] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, success: 0, failed: 0 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendResults, setSendResults] = useState<{ success: number; failed: number; results: any[] } | null>(null);

  const availablePlaceholders = whatsAppService.getAvailablePlaceholders();

  // Sample booking for preview
  const sampleBooking = bookings.length > 0 ? bookings[0] : null;

  useEffect(() => {
    if (messageTemplate && sampleBooking) {
      const preview = whatsAppService.previewMessage(messageTemplate, sampleBooking);
      setPreviewMessage(preview);
    } else {
      setPreviewMessage('');
    }
  }, [messageTemplate, sampleBooking]);

  const handleSendMessages = async () => {
    if (!messageTemplate.trim()) {
      alert('Please enter a message template');
      return;
    }

    if (bookings.length === 0) {
      alert('No bookings found to send messages to');
      return;
    }

    setIsSending(true);
    setSendProgress({ sent: 0, total: bookings.length, success: 0, failed: 0 });

    try {
      const results = await whatsAppService.sendBatchMessages(
        messageTemplate,
        bookings,
        (sent, total, success, failed) => {
          setSendProgress({ sent, total, success, failed });
        }
      );

      setSendResults(results);
      setShowConfirm(false);
      
      // Show success/failure summary
      alert(`Batch messaging completed!\nSuccessful: ${results.success}\nFailed: ${results.failed}`);
      
    } catch (error) {
      console.error('Batch messaging error:', error);
      alert('Failed to send messages. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('message-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = messageTemplate.substring(0, start) + placeholder + messageTemplate.substring(end);
      setMessageTemplate(newValue);
      
      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const resetModal = () => {
    setMessageTemplate('');
    setPreviewMessage('');
    setIsSending(false);
    setSendProgress({ sent: 0, total: 0, success: 0, failed: 0 });
    setShowConfirm(false);
    setSendResults(null);
  };

  const handleClose = () => {
    if (!isSending) {
      resetModal();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Send Batch WhatsApp Messages</h2>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Send personalized messages to {bookings.length} booking(s)</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Message Template Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template
            </label>
            <textarea
              id="message-template"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Enter your message template with placeholders..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSending}
            />
            
            {/* Placeholder Helper */}
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availablePlaceholders.map((placeholder) => (
                  <button
                    key={placeholder}
                    onClick={() => insertPlaceholder(placeholder)}
                    disabled={isSending}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {previewMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview (Sample Message)
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[80px] whitespace-pre-wrap">
                {previewMessage}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Preview based on: {sampleBooking?.participantName || sampleBooking?.fullName || 'Sample booking'}
              </p>
            </div>
          )}

          {/* Progress Section */}
          {isSending && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sending Progress
              </label>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress: {sendProgress.sent}/{sendProgress.total}</span>
                  <span>Success: {sendProgress.success} | Failed: {sendProgress.failed}</span>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {sendResults && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results Summary
              </label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  ✅ Successfully sent: {sendResults.success} messages<br/>
                  ❌ Failed: {sendResults.failed} messages
                </p>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Batch Messaging</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to send messages to {bookings.length} recipients?
                  This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessages}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Send Messages
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Close'}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isSending || !messageTemplate.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Send Messages ({bookings.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
