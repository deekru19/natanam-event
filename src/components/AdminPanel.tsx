import React, { useState, useEffect } from 'react';
import { exportBookingsToCSV, downloadCSV, getAllFlatBookings, FlatBooking, deleteBooking, updateBooking, addBooking, getAvailableTimeSlots } from '../services/firebaseService';
import { getEventDate } from '../utils/timeUtils';
import { eventConfig } from '../config/eventConfig';

const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<FlatBooking[]>([]);
  const [editingBooking, setEditingBooking] = useState<FlatBooking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add resizable column functionality
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .resizable-table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
      }
      .resizable-table th {
        position: relative;
        user-select: none;
        border-right: 1px solid #e2e8f0;
      }
      .resizable-table th .resize-handle {
        position: absolute;
        top: 0;
        right: 0;
        width: 5px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        z-index: 1;
      }
      .resizable-table th .resize-handle:hover {
        background: rgba(59, 130, 246, 0.4);
      }
      .resizable-table th.resizing {
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    const addResizeHandlers = () => {
      const table = document.querySelector('.resizable-table') as HTMLTableElement;
      if (!table) return;

      const headers = table.querySelectorAll('th');
      headers.forEach((header, index) => {
        if (index === headers.length - 1) return; // Skip last column

        // Remove existing handle if any
        const existingHandle = header.querySelector('.resize-handle');
        if (existingHandle) existingHandle.remove();

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        header.appendChild(resizeHandle);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
          isResizing = true;
          startX = e.clientX;
          startWidth = header.offsetWidth;
          header.classList.add('resizing');
          document.body.style.cursor = 'col-resize';
          e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
          const diff = e.clientX - startX;
          const newWidth = Math.max(100, startWidth + diff); // Minimum width of 100px
          header.style.width = newWidth + 'px';
          header.style.minWidth = newWidth + 'px';
        });

        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false;
            header.classList.remove('resizing');
            document.body.style.cursor = 'default';
          }
        });
      });
    };

    // Add handlers after a short delay to ensure table is rendered
    setTimeout(addResizeHandlers, 100);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [bookings]); // Re-run when bookings change
  const [newBooking, setNewBooking] = useState<Partial<FlatBooking>>({});
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [editAvailableTimeSlots, setEditAvailableTimeSlots] = useState<string[]>([]);

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

  const loadAvailableTimeSlots = async (date: string) => {
    try {
      console.log('Loading available time slots for date:', date);
      const slots = await getAvailableTimeSlots(date);
      console.log('Available slots:', slots);
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Failed to load available time slots:', error);
      setAvailableTimeSlots([]);
    }
  };

  const loadEditAvailableTimeSlots = async (date: string, currentTimeSlot: string) => {
    try {
      const slots = await getAvailableTimeSlots(date);
      // Include the current time slot in the options for editing
      if (!slots.includes(currentTimeSlot)) {
        slots.push(currentTimeSlot);
      }
      setEditAvailableTimeSlots(slots.sort());
    } catch (error) {
      console.error('Failed to load available time slots for editing:', error);
      setEditAvailableTimeSlots([currentTimeSlot]);
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
      return new Date(timestamp.toDate()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
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
              onClick={async () => {
                setShowAddModal(true);
                // Set default date to event date
                const eventDate = eventConfig.eventDate;
                setNewBooking({...newBooking, date: eventDate});
                await loadAvailableTimeSlots(eventDate);
              }}
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
            <table className="min-w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg overflow-hidden resizable-table" style={{tableLayout: 'fixed'}}>
                            <thead className="bg-gradient-to-r from-blue-100 to-indigo-200 text-gray-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '160px', minWidth: '100px'}}>Actions</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '160px', minWidth: '160px'}}>Time</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '90px', minWidth: '90px'}}>Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '110px', minWidth: '110px'}}>Price/Person</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '180px', minWidth: '180px'}}>Participant Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '140px', minWidth: '140px'}}>Phone</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '220px', minWidth: '220px'}}>Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>City</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '150px', minWidth: '150px'}}>Guru Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>Category</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>Amount/Slot</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '160px', minWidth: '160px'}}>Timestamp</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '180px', minWidth: '180px'}}>Payment ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{width: '140px', minWidth: '140px'}}>Booking ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bookings.map((booking, index) => (
                  <tr key={booking.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-sm border-b border-slate-200">
                      <div className="flex space-x-1">
                        <button
                          onClick={async () => {
                            setEditingBooking(booking);
                            await loadEditAvailableTimeSlots(booking.date, booking.timeSlot);
                          }}
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
                      {booking.timeSlot}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.performanceTypeName}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      ₹{booking.pricePerPerson}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.participantName}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.performanceType === 'duet' 
                        ? `${booking.participant1Phone || ''} / ${booking.participant2Phone || ''}` 
                        : booking.phoneNumber || booking.representativePhone || '-'}
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
                      ₹{booking.amountPerSlot}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {formatTimestamp(booking.timestamp)}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.paymentId || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.paymentStatus || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                      {booking.bookingId}
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
                    onChange={async (e) => {
                      const newDate = e.target.value;
                      setEditingBooking({...editingBooking, date: newDate});
                      await loadEditAvailableTimeSlots(newDate, editingBooking.timeSlot);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                  <select
                    value={editingBooking.timeSlot}
                    onChange={(e) => setEditingBooking({...editingBooking, timeSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a time slot</option>
                    {editAvailableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
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
                
                {/* Phone number fields - conditional based on performance type */}
                {editingBooking.performanceType === 'duet' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Participant 1 Phone</label>
                      <input
                        type="text"
                        value={editingBooking.participant1Phone || ''}
                        onChange={(e) => setEditingBooking({...editingBooking, participant1Phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Participant 2 Phone</label>
                      <input
                        type="text"
                        value={editingBooking.participant2Phone || ''}
                        onChange={(e) => setEditingBooking({...editingBooking, participant2Phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                ) : editingBooking.performanceType === 'group' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Representative Phone</label>
                    <input
                      type="text"
                      value={editingBooking.representativePhone || ''}
                      onChange={(e) => setEditingBooking({...editingBooking, representativePhone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      value={editingBooking.phoneNumber || ''}
                      onChange={(e) => setEditingBooking({...editingBooking, phoneNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
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
                  <label className="block text-sm font-medium text-gray-700">Amount Per Slot</label>
                  <input
                    type="number"
                    value={editingBooking.amountPerSlot}
                    onChange={(e) => setEditingBooking({...editingBooking, amountPerSlot: parseInt(e.target.value)})}
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
                    onChange={async (e) => {
                      const newDate = e.target.value;
                      setNewBooking({...newBooking, date: newDate, timeSlot: ''}); // Clear time slot when date changes
                      await loadAvailableTimeSlots(newDate);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                  <select
                    value={newBooking.timeSlot || ''}
                    onChange={(e) => setNewBooking({...newBooking, timeSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a time slot</option>
                    {availableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-medium text-gray-700">Amount Per Slot</label>
                  <input
                    type="number"
                    value={newBooking.amountPerSlot || ''}
                    onChange={(e) => setNewBooking({...newBooking, amountPerSlot: parseInt(e.target.value)})}
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