import React, { useState, useEffect } from 'react';
import { exportBookingsToCSV, downloadCSV, getAllFlatBookings, FlatBooking, deleteBooking, updateBooking, addBooking } from '../services/firebaseService';
import { getEventDate } from '../utils/timeUtils';

const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<FlatBooking[]>([]);
  const [editingBooking, setEditingBooking] = useState<FlatBooking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBooking, setNewBooking] = useState<Partial<FlatBooking>>({});

  // Load bookings on component mount
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
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

  const handleExportCSV = async () => {
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

  const handleDelete = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await deleteBooking(bookingId);
        await loadBookings(); // Reload the list
        alert('Booking deleted successfully');
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete booking. Please try again.');
      }
    }
  };

  const handleUpdate = async (booking: FlatBooking) => {
    try {
      await updateBooking(booking);
      setEditingBooking(null);
      await loadBookings(); // Reload the list
      alert('Booking updated successfully');
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update booking. Please try again.');
    }
  };

  const handleAdd = async () => {
    try {
      await addBooking(newBooking as FlatBooking);
      setShowAddModal(false);
      setNewBooking({});
      await loadBookings(); // Reload the list
      alert('Booking added successfully');
    } catch (error) {
      console.error('Add failed:', error);
      alert('Failed to add booking. Please try again.');
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
    <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Admin Panel - Booking Management</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Add Booking
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-pink-400 rounded-full animate-spin animation-delay-150"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              All Bookings ({bookings.length} records)
            </h3>
            <table className="min-w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                                                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Actions
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Booking ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Price/Slot
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Participant Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Full Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Phone
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      City
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Guru Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Total Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      Timestamp
                    </th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bookings.map((booking, index) => (
                  <tr key={booking.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-sm border-b border-slate-200">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setEditingBooking(booking)}
                          className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(booking.id!)}
                          className="px-2 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs rounded hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.bookingId}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.date}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.timeSlot}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.performanceTypeName}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      ₹{booking.pricePerSlot}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.participantName}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.fullName || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.phoneNumber || booking.representativePhone || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.email || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.cityResidence || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.guruName || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.performanceCategory || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      ₹{booking.totalAmount}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {formatTimestamp(booking.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Admin Panel Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>View Bookings:</strong> All bookings are displayed by default</li>
            <li>• <strong>Add Booking:</strong> Click "Add Booking" to manually add a new booking</li>
            <li>• <strong>Edit Booking:</strong> Click "Edit" on any row to modify booking details</li>
            <li>• <strong>Delete Booking:</strong> Click "Delete" to remove a booking (with confirmation)</li>
            <li>• <strong>Export CSV:</strong> Download all bookings as a CSV file</li>
            <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
          </ul>
        </div>

        {/* Edit Modal */}
        {editingBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Edit Booking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                  <input
                    type="text"
                    value={editingBooking.bookingId}
                    onChange={(e) => setEditingBooking({...editingBooking, bookingId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={editingBooking.date}
                    onChange={(e) => setEditingBooking({...editingBooking, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                  <input
                    type="text"
                    value={editingBooking.timeSlot}
                    onChange={(e) => setEditingBooking({...editingBooking, timeSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performance Type</label>
                  <input
                    type="text"
                    value={editingBooking.performanceTypeName}
                    onChange={(e) => setEditingBooking({...editingBooking, performanceTypeName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={editingBooking.fullName || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={editingBooking.phoneNumber || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editingBooking.email || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={editingBooking.cityResidence || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, cityResidence: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Guru Name</label>
                  <input
                    type="text"
                    value={editingBooking.guruName || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, guruName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performance Category</label>
                  <input
                    type="text"
                    value={editingBooking.performanceCategory || ''}
                    onChange={(e) => setEditingBooking({...editingBooking, performanceCategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <input
                    type="number"
                    value={editingBooking.totalAmount}
                    onChange={(e) => setEditingBooking({...editingBooking, totalAmount: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdate(editingBooking)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add New Booking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                  <input
                    type="text"
                    value={newBooking.bookingId || ''}
                    onChange={(e) => setNewBooking({...newBooking, bookingId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={newBooking.date || ''}
                    onChange={(e) => setNewBooking({...newBooking, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                  <input
                    type="text"
                    value={newBooking.timeSlot || ''}
                    onChange={(e) => setNewBooking({...newBooking, timeSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performance Type</label>
                  <input
                    type="text"
                    value={newBooking.performanceTypeName || ''}
                    onChange={(e) => setNewBooking({...newBooking, performanceTypeName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={newBooking.fullName || ''}
                    onChange={(e) => setNewBooking({...newBooking, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={newBooking.phoneNumber || ''}
                    onChange={(e) => setNewBooking({...newBooking, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newBooking.email || ''}
                    onChange={(e) => setNewBooking({...newBooking, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={newBooking.cityResidence || ''}
                    onChange={(e) => setNewBooking({...newBooking, cityResidence: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Guru Name</label>
                  <input
                    type="text"
                    value={newBooking.guruName || ''}
                    onChange={(e) => setNewBooking({...newBooking, guruName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performance Category</label>
                  <input
                    type="text"
                    value={newBooking.performanceCategory || ''}
                    onChange={(e) => setNewBooking({...newBooking, performanceCategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <input
                    type="number"
                    value={newBooking.totalAmount || ''}
                    onChange={(e) => setNewBooking({...newBooking, totalAmount: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBooking({});
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 