import React, { useState, useMemo } from 'react';
import { Calendar, User, Clock, Plus, UserCheck, Search, Stethoscope, IdCard, X, Edit, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { ToastContainer } from './Toast';
import ConfirmModal from './ConfirmModal';
import useDoctors from '../hooks/useDoctors';
import useAppointments from '../hooks/useAppointments';

const AppointmentScheduler = ({ patients }) => {
  const { doctors, loading, addDoctor, updateDoctor, deleteDoctor, submitting } = useDoctors();
  const { appointments, createAppointment, fetchAppointments, submitting: appointmentSubmitting } = useAppointments();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [showEditDoctorForm, setShowEditDoctorForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [toasts, setToasts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [appointmentFilter, setAppointmentFilter] = useState('today'); // 'today' or 'all'
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Current month (YYYY-MM)
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'scheduled', 'completed'
  const [newAppointment, setNewAppointment] = useState({
    patientNationalId: '',
    date: '',
    time: ''
  });
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    empId: '',
    specialization: ''
  });

  const showToast = (type, title, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, title, message, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedPatient = patients.find(p => p.nationalId === newAppointment.patientNationalId);
    
    if (selectedPatient && selectedDoctor) {
      const appointmentData = {
        doctorEmployeeId: parseInt(selectedDoctor.empId),
        patientNationalId: parseInt(selectedPatient.nationalId),
        appointmentDate: newAppointment.date,
        appointmentTime: newAppointment.time
      };
      
      const result = await createAppointment(appointmentData);
      
      if (result) {
        setNewAppointment({
          patientNationalId: '',
          date: '',
          time: ''
        });
        setPatientSearch('');
        setShowAppointmentForm(false);
      }
    }
  };

  const getDoctorAppointments = (doctorId) => {
    let doctorAppointments = appointments.filter(apt => apt.doctorEmployeeId === doctorId);
    
    // Apply date filter
    if (appointmentFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      doctorAppointments = doctorAppointments.filter(apt => apt.date === today);
    } else if (appointmentFilter === 'month') {
      // Filter by selected month
      doctorAppointments = doctorAppointments.filter(apt => {
        if (!apt.date) return false;
        return apt.date.slice(0, 7) === selectedMonth; // Compare YYYY-MM
      });
    }
    
    // Apply status filter (only for today and month views)
    if ((appointmentFilter === 'today' || appointmentFilter === 'month') && statusFilter !== 'all') {
      doctorAppointments = doctorAppointments.filter(apt => {
        const appointmentStatus = apt.status?.toLowerCase();
        if (statusFilter === 'scheduled') {
          return appointmentStatus === 'scheduled' || appointmentStatus === 'pending';
        } else if (statusFilter === 'completed') {
          return appointmentStatus === 'completed' || appointmentStatus === 'done';
        }
        return true;
      });
    }
    
    // Apply search filter
    if (appointmentSearch.trim()) {
      const searchTerm = appointmentSearch.toLowerCase();
      doctorAppointments = doctorAppointments.filter(apt => 
        apt.patientName?.toLowerCase().includes(searchTerm) ||
        String(apt.patientNationalId).includes(searchTerm) ||
        apt.time?.includes(searchTerm) ||
        apt.date?.includes(searchTerm)
      );
    }
    
    return doctorAppointments;
  };

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    return patients.filter(patient =>
      patient.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      String(patient.nationalId).includes(patientSearch) ||
      String(patient.contactNumber).includes(patientSearch)
    );
  }, [patients, patientSearch]);

  const handlePatientSelect = (nationalId) => {
    setNewAppointment({...newAppointment, patientNationalId: nationalId});
    setPatientSearch('');
  };

  const handleCloseForm = () => {
    setShowAppointmentForm(false);
    setPatientSearch('');
    setNewAppointment({
      patientNationalId: '',
      date: '',
      time: ''
    });
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    if (!newDoctor.name || !newDoctor.empId || !newDoctor.specialization) {
      showToast('warning', 'Missing Information', 'Please fill in all fields');
      return;
    }

    const success = await addDoctor(newDoctor, showToast);
    
    if (success) {
      setNewDoctor({ name: '', empId: '', specialization: '' });
      setShowAddDoctorForm(false);
    }
  };

  const handleCloseDoctorForm = () => {
    setShowAddDoctorForm(false);
    setNewDoctor({ name: '', empId: '', specialization: '' });
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor({ ...doctor });
    setShowEditDoctorForm(true);
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    
    if (!editingDoctor.name || !editingDoctor.specialization) {
      showToast('warning', 'Missing Information', 'Please fill in all fields');
      return;
    }

    const success = await updateDoctor(editingDoctor, showToast);
    
    if (success) {
      setEditingDoctor(null);
      setShowEditDoctorForm(false);
    }
  };

  const handleCloseEditForm = () => {
    setShowEditDoctorForm(false);
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (doctor) => {
    setDoctorToDelete(doctor);
    setShowConfirmModal(true);
  };

  const confirmDeleteDoctor = async () => {
    if (doctorToDelete) {
      await deleteDoctor(doctorToDelete.id, showToast);
      setDoctorToDelete(null);
    }
  };

  const cancelDeleteDoctor = () => {
    setShowConfirmModal(false);
    setDoctorToDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
            <Calendar size={28} className="mr-3 text-blue-500" />
            Patient Care Schedule
          </h2>
          <p className="text-gray-600">Coordinate patient visits and manage medical team schedules</p>
        </div>
        <button
          onClick={() => setShowAddDoctorForm(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>Add Medical Staff</span>
        </button>
      </div>
      {/* Doctors Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No medical staff found</p>
          <p className="text-sm">Add medical staff to manage patient schedules</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.map((doctor) => (
          <div
            key={doctor.id}
            onClick={() => setSelectedDoctor(doctor)}
            className={`relative bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-102 ${
              selectedDoctor?.id === doctor.id 
                ? `border-${doctor.textColor.split('-')[1]}-300 ring-4 ring-${doctor.textColor.split('-')[1]}-50` 
                : 'border-gray-100 hover:border-gray-200'
            } ${!doctor.available ? 'opacity-60' : ''}`}
          >
            {/* Doctor Card */}
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${doctor.color} flex items-center justify-center ${doctor.textColor} font-bold text-lg mb-4 shadow-sm`}>
                  {doctor.avatar}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{doctor.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{doctor.specialization}</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${doctor.available ? 'bg-green-300' : 'bg-red-300'}`}></div>
                  <span className={`text-xs font-medium ${doctor.available ? 'text-green-500' : 'text-red-500'}`}>
                    {doctor.available ? 'Available' : 'Unavailable'}</span>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  {getDoctorAppointments(doctor.empId).length} patient visits today
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="absolute top-3 right-3 flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditDoctor(doctor);
                }}
                className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                title="Edit Doctor"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDoctor(doctor);
                }}
                className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                title="Delete Doctor"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Selection Indicator */}
            {selectedDoctor?.id === doctor.id && (
              <div className="absolute top-3 left-3">
                <div className={`w-6 h-6 ${doctor.bgColor} rounded-full flex items-center justify-center border-2 border-${doctor.textColor.split('-')[1]}-200`}>
                  <UserCheck size={14} className={doctor.textColor} />
                </div>
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Doctor Section */}
      {selectedDoctor && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Doctor Header */}
          <div className={`${selectedDoctor.bgColor} p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${selectedDoctor.color} rounded-full flex items-center justify-center ${selectedDoctor.textColor} font-bold shadow-sm`}>
                  {selectedDoctor.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedDoctor.name}</h3>
                  <p className="text-gray-600">{selectedDoctor.specialization}</p>
                </div>
              </div>
              {selectedDoctor.available && (
                <button
                  onClick={() => setShowAppointmentForm(true)}
                  className={`${selectedDoctor.bgColor} hover:bg-opacity-80 ${selectedDoctor.textColor} px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 border border-${selectedDoctor.textColor.split('-')[1]}-200`}
                >
                  <Plus size={16} />
                  <span>Schedule Visit</span>
                </button>
              )}
            </div>
          </div>

          {/* Appointments List */}
          <div className="p-6">
            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar size={20} className="mr-2" />
                  Patient Visits
                </h4>
                
                {/* Filter Buttons */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setAppointmentFilter('today')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      appointmentFilter === 'today'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('month')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      appointmentFilter === 'month'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('all')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      appointmentFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
              
              {/* Month Selector (only visible when Month filter is selected) */}
              {appointmentFilter === 'month' && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Select Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              )}
              
              {/* Status Filter (only visible for today and month views) */}
              {(appointmentFilter === 'today' || appointmentFilter === 'month') && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <div className="flex bg-gray-50 rounded-lg p-1">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('scheduled')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'scheduled'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Scheduled
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'completed'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              )}
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patient visits by name, ID, time, or date..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                {appointmentSearch && (
                  <button
                    onClick={() => setAppointmentSearch('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {getDoctorAppointments(selectedDoctor.empId).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {appointmentSearch.trim() 
                    ? 'No appointments match your search'
                    : appointmentFilter === 'today' 
                      ? (statusFilter === 'all' 
                          ? 'No appointments for today'
                          : statusFilter === 'scheduled'
                            ? 'No scheduled appointments for today'
                            : 'No completed appointments for today')
                      : appointmentFilter === 'month'
                        ? (statusFilter === 'all'
                            ? `No appointments for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                            : statusFilter === 'scheduled'
                              ? `No scheduled appointments for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                              : `No completed appointments for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`)
                        : 'No appointments scheduled'
                  }
                </p>
                <p className="text-sm">
                  {appointmentSearch.trim() 
                    ? 'Try adjusting your search terms'
                    : (appointmentFilter === 'today' || appointmentFilter === 'month') && statusFilter !== 'all'
                      ? 'Try changing the status filter or schedule new appointments'
                      : appointmentFilter === 'month'
                        ? 'Try selecting a different month or schedule new appointments'
                        : 'Schedule a patient to get started'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getDoctorAppointments(selectedDoctor.empId).map((appointment) => {
                  // Format time to user-friendly format
                  const formatTime = (timeString) => {
                    if (!timeString) return 'N/A';
                    try {
                      const [hours, minutes] = timeString.split(':');
                      const hour24 = parseInt(hours);
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? 'PM' : 'AM';
                      return `${hour12}:${minutes} ${ampm}`;
                    } catch {
                      return timeString;
                    }
                  };

                  // Format date to user-friendly format
                  const formatDate = (dateString) => {
                    if (!dateString) return 'N/A';
                    try {
                      const date = new Date(dateString);
                      const today = new Date();
                      const tomorrow = new Date(today);
                      tomorrow.setDate(today.getDate() + 1);
                      
                      // Check if it's today, tomorrow, or another date
                      if (date.toDateString() === today.toDateString()) {
                        return 'Today';
                      } else if (date.toDateString() === tomorrow.toDateString()) {
                        return 'Tomorrow';
                      } else {
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                        });
                      }
                    } catch {
                      return dateString;
                    }
                  };

                  // Check if appointment is today
                  const isToday = () => {
                    if (!appointment.date) return false;
                    try {
                      const appointmentDate = new Date(appointment.date);
                      const today = new Date();
                      return appointmentDate.toDateString() === today.toDateString();
                    } catch {
                      return false;
                    }
                  };

                  const handleCompleteAppointment = async (appointmentId) => {
                    try {
                      const jwtToken = localStorage.getItem('jwtToken');
                      
                      if (!jwtToken) {
                        showToast('error', 'Authentication Required', 'Please log in again.');
                        return;
                      }

                      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
                        method: 'PUT',
                        headers: {
                          'Authorization': `Bearer ${jwtToken}`,
                          'Content-Type': 'application/json'
                        }
                      });

                      if (response.ok) {
                        showToast('success', 'Success', 'Appointment completed successfully!');
                        // Refresh appointments to get updated status without page reload
                        await fetchAppointments();
                      } else if (response.status === 401) {
                        showToast('error', 'Authentication Failed', 'Please log in again.');
                      } else if (response.status === 403) {
                        showToast('error', 'Access Denied', 'You do not have permission to complete appointments.');
                      } else if (response.status === 404) {
                        showToast('error', 'Not Found', 'Appointment not found.');
                      } else {
                        showToast('error', 'Error', 'Failed to complete appointment. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error completing appointment:', error);
                      showToast('error', 'Network Error', 'Failed to complete appointment. Please check your connection.');
                    }
                  };

                  return (
                    <div key={appointment.id} className="bg-gray-25 rounded-xl p-4 flex items-center justify-between border border-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="text-center min-w-[80px]">
                          <div className="text-lg font-bold text-gray-700">{formatTime(appointment.time)}</div>
                          <div className="text-sm font-medium text-gray-600">{formatDate(appointment.date)}</div>
                          <div className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded-full mt-1">Scheduled</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{appointment.patientName}</div>
                          <div className="text-sm text-gray-400">ID: {appointment.patientNationalId}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={appointment.status} />
                        {isToday() && (
                          <button
                            onClick={() => handleCompleteAppointment(appointment.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        <button className="text-blue-400 hover:text-blue-600 font-medium text-sm">Edit</button>
                        <button className="text-red-400 hover:text-red-600 font-medium text-sm">Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Form Modal */}
      {showAppointmentForm && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
            <div className={`${selectedDoctor.bgColor} p-6 rounded-t-2xl border-b border-gray-100`}>
              <h4 className="text-xl font-bold text-gray-800">Schedule Appointment</h4>
              <p className="text-gray-600">Book a patient with {selectedDoctor.name}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Patient</label>
                
                {/* Search Field */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search patients by name, ID, or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
                </div>

                {/* Selected Patient Display */}
                {newAppointment.patientNationalId && (
                  <div className="bg-blue-25 border border-blue-100 rounded-xl p-4 mb-4">
                    {(() => {
                      const selectedPatient = patients.find(p => p.nationalId === newAppointment.patientNationalId);
                      return selectedPatient ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-800">{selectedPatient.fullName}</div>
                            <div className="text-sm text-gray-500">ID: {selectedPatient.nationalId}</div>
                            <div className="text-sm text-gray-500">Phone: {selectedPatient.contactNumber}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewAppointment({...newAppointment, patientNationalId: ''})}
                            className="text-red-400 hover:text-red-600 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Patient List */}
                {patientSearch && !newAppointment.patientNationalId && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(patient => (
                        <div
                          key={patient.nationalId}
                          onClick={() => handlePatientSelect(patient.nationalId)}
                          className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700 font-bold text-sm">
                              {patient.fullName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{patient.fullName}</div>
                              <div className="text-sm text-gray-500">ID: {patient.nationalId}</div>
                              <div className="text-sm text-gray-500">Phone: {patient.contactNumber}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <Search size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No patients found matching your search</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback message when no patient is selected and no search */}
                {!newAppointment.patientNationalId && !patientSearch && (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                    <User size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">Search and select a patient</p>
                    <p className="text-sm">Type in the search box above to find patients</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Date</label>
                <input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Time</label>
                <input
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={appointmentSubmitting}
                  className="flex-1 bg-blue-400 hover:bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  {appointmentSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-3 rounded-xl font-medium transition-colors border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Doctor Form Modal */}
      {showAddDoctorForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm border border-gray-100">
            <div className="bg-green-50 p-4 rounded-t-xl border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Add New Doctor</h4>
                  <p className="text-sm text-gray-600">Enter doctor information</p>
                </div>
                <button
                  onClick={handleCloseDoctorForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddDoctor} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />
                  Doctor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. John Smith"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <IdCard size={14} className="inline mr-1" />
                  Employee ID
                </label>
                <input
                  type="text"
                  placeholder="e.g., EMP001"
                  value={newDoctor.empId}
                  onChange={(e) => setNewDoctor({...newDoctor, empId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Stethoscope size={14} className="inline mr-1" />
                  Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g., Nephrology, Cardiology"
                  value={newDoctor.specialization}
                  onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  required
                />
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  {submitting ? 'Adding...' : 'Add Doctor'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseDoctorForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Form Modal */}
      {showEditDoctorForm && editingDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm border border-gray-100">
            <div className="bg-blue-50 p-4 rounded-t-xl border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Edit Doctor</h4>
                  <p className="text-sm text-gray-600">Update doctor information</p>
                </div>
                <button
                  onClick={handleCloseEditForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdateDoctor} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />
                  Doctor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. John Smith"
                  value={editingDoctor.name}
                  onChange={(e) => setEditingDoctor({...editingDoctor, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <IdCard size={14} className="inline mr-1" />
                  Employee ID
                </label>
                <input
                  type="text"
                  value={editingDoctor.empId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Employee ID cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Stethoscope size={14} className="inline mr-1" />
                  Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g., Nephrology, Cardiology"
                  value={editingDoctor.specialization}
                  onChange={(e) => setEditingDoctor({...editingDoctor, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Update Doctor
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteDoctor}
        onConfirm={confirmDeleteDoctor}
        title="Delete Doctor"
        message={`Are you sure you want to remove ${doctorToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete Doctor"
        cancelText="Cancel"
        type="danger"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default AppointmentScheduler;