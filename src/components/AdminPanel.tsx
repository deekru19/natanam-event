import React, { useState } from 'react';
import { exportBookingsToCSV, downloadCSV, getAllFlatBookings, FlatBooking } from '../services/firebaseService';
import { getEventDate } from '../utils/timeUtils';

const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<FlatBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleExportAll = async () => {
    setLoading(true);
    try {
      const csvContent = await exportBookingsToCSV();
      if (csvContent) {
        const filename = `dance_event_bookings_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
      } else {
        alert('No bookings found to export.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportByDate = async () => {
    if (!selectedDate) {
      alert('Please select a date.');
      return;
    }

    setLoading(true);
    try {
      const csvContent = await exportBookingsToCSV(selectedDate);
      if (csvContent) {
        const filename = `dance_event_bookings_${selectedDate}.csv`;
        downloadCSV(csvContent, filename);
      } else {
        alert(`No bookings found for ${selectedDate}.`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookings = async () => {
    setLoading(true);
    try {
      const allBookings = await getAllFlatBookings();
      setBookings(allBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      alert('Failed to fetch bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp.toDate()).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel - Booking Management</h2>
        
        {/* Export Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Export All Bookings</h3>
            <button
              onClick={handleExportAll}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export All (CSV)'}
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Export by Date</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleExportByDate}
              disabled={loading || !selectedDate}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export by Date (CSV)'}
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">View All Bookings</h3>
            <button
              onClick={handleViewBookings}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'View Bookings'}
            </button>
          </div>
        </div>

        {/* Bookings Table */}
        {bookings.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              All Bookings ({bookings.length} records)
            </h3>
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Booking ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Participant
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Dance Style
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <tr key={booking.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.bookingId}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.date}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.timeSlot}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.performanceTypeName}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.participantName}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {booking.danceStyle}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      ₹{booking.totalAmount}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                      {formatTimestamp(booking.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">CSV Export Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Export All:</strong> Downloads all bookings across all dates</li>
            <li>• <strong>Export by Date:</strong> Downloads bookings for a specific date</li>
            <li>• <strong>View Bookings:</strong> Shows all bookings in a table format</li>
            <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
            <li>• Each row represents one time slot booking with complete participant details</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 