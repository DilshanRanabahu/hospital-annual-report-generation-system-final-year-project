import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  Calendar,
  Settings,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Save,
  X
} from 'lucide-react';
import { useDialysisWebSocket } from '../hooks/useDialysisWebSocket';

/**
 * SessionScheduler Component - Enhanced with Machine Conflict Prevention
 * 
 * FEATURES:
 * ✅ Real-time machine availability checking
 * ✅ Time slot conflict detection and prevention
 * ✅ Visual conflict indicators for all machines
 * ✅ Automatic machine blocking during scheduled sessions
 * ✅ Enhanced validation before session creation
 * ✅ Detailed conflict information display
 * 
 * CONFLICT PREVENTION LOGIC:
 * 1. When user selects date, time, and duration - system checks ALL machines
 * 2. Calculates time overlaps with existing sessions
 * 3. Shows only conflict-free machines for selection
 * 4. Prevents double-booking by blocking conflicted machines
 * 5. Validates again before final submission
 * 
 * MACHINE STATES:
 * - 🟢 Available: No conflicts, machine operational
 * - 🔴 Time Conflict: Overlapping session detected
 * - 🟡 Busy/Maintenance: Machine unavailable for other reasons
 */

export default function SessionScheduler({
  dialysisPatients = [],
  existingSessions = [],
  loading = false,
  onScheduleSession,
  getMachinesWithAvailability
  // onUpdateSession, // Future use
  // onCancelSession  // Future use
}) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('4'); // hours

  // WebSocket integration for real-time machine status updates
  const { 
    messages: wsMessages, 
    connectionStatus 
  } = useDialysisWebSocket();

  // Enhanced machine availability checking with conflict prevention - moved up for hoisting
  const fetchAvailableMachines = React.useCallback(async (date, startTime, duration) => {
    if (!getMachinesWithAvailability || !date || !startTime || !duration) {
      return;
    }

    try {
      setMachinesLoading(true);
      const machineData = await getMachinesWithAvailability(date, startTime, duration);
      
      // Calculate requested session time period
      const requestedStart = new Date(`${date}T${startTime}`);
      const requestedEnd = new Date(requestedStart.getTime() + (parseInt(duration) * 60 * 60 * 1000));
      
      // Enhanced machine availability checking with dynamic status updates
      const transformedMachines = machineData.map(machine => {
        // Check for existing sessions that would conflict with requested time
        const conflictingSessions = existingSessions.filter(session => {
          if (session.machineId !== machine.machineId || 
              session.scheduledDate !== date || 
              session.status === 'completed' || 
              session.status === 'cancelled') {
            return false;
          }
          
          // Parse existing session times
          const sessionStart = new Date(`${session.scheduledDate}T${session.startTime}`);
          const sessionDuration = parseFloat(session.duration) || 4; // Default 4 hours if not specified
          const sessionEnd = new Date(sessionStart.getTime() + (sessionDuration * 60 * 60 * 1000));
          
          // Check for time overlap
          return (requestedStart < sessionEnd && requestedEnd > sessionStart);
        });
        
        const hasTimeConflicts = conflictingSessions.length > 0;
        
        // Enhanced availability logic: consider both machine status AND scheduling conflicts
        const isMachineOperational = ['active', 'idle', 'ready'].includes(machine.status?.toLowerCase());
        const isMachineAvailable = machine.available !== false; // API availability flag
        const isRealTimeAvailable = !['in_use', 'occupied', 'reserved'].includes(machine.status?.toLowerCase());
        
        // Machine is available if:
        // 1. Machine is operational (not maintenance/out_of_order)
        // 2. API says it's available
        // 3. Real-time status is not in_use/occupied
        // 4. No scheduling conflicts
        const isFullyAvailable = isMachineOperational && isMachineAvailable && isRealTimeAvailable && !hasTimeConflicts;
        
        return {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status ? machine.status.toLowerCase() : 'active',
          model: machine.model,
          location: machine.location,
          isAvailable: isFullyAvailable,
          conflictCount: conflictingSessions.length,
          conflicts: conflictingSessions,
          conflictDetails: hasTimeConflicts ? conflictingSessions.map(session => ({
            patientName: session.patientName,
            startTime: session.startTime,
            endTime: session.endTime || 'Ongoing',
            status: session.status
          })) : [],
          // Enhanced status info
          isOperational: isMachineOperational,
          isRealTimeAvailable: isRealTimeAvailable,
          hasTimeConflicts: hasTimeConflicts,
          statusReason: !isMachineOperational 
            ? `Machine status: ${machine.status}` 
            : !isRealTimeAvailable 
            ? 'Currently in use'
            : hasTimeConflicts 
            ? `${conflictingSessions.length} scheduling conflict(s)`
            : 'Available'
        };
      });
      
      setMachines(transformedMachines);
      setAvailableMachines(transformedMachines.filter(machine => machine.isAvailable));
      
      console.log('🔍 Machine availability check results:', {
        total: transformedMachines.length,
        available: transformedMachines.filter(m => m.isAvailable).length,
        conflicted: transformedMachines.filter(m => m.hasTimeConflicts).length,
        inUse: transformedMachines.filter(m => !m.isRealTimeAvailable).length,
        maintenance: transformedMachines.filter(m => !m.isOperational).length
      });
      
    } catch (error) {
      console.error('❌ Error fetching available machines:', error);
      setMachines([]);
      setAvailableMachines([]);
    } finally {
      setMachinesLoading(false);
    }
  }, [getMachinesWithAvailability, existingSessions]);

  // Listen for real-time machine status updates
  React.useEffect(() => {
    if (wsMessages?.type === 'MACHINE_STATUS_UPDATE' && wsMessages?.data) {
      const { machineId, status } = wsMessages.data;
      
      // Update machine status in real-time
      setMachines(prevMachines => 
        prevMachines.map(machine => 
          machine.id === machineId 
            ? { ...machine, status: status.toLowerCase() }
            : machine
        )
      );
      
      // Re-check availability if we have selected time parameters
      if (selectedDate && selectedTime && selectedDuration) {
        fetchAvailableMachines(selectedDate, selectedTime, selectedDuration);
      }
    }
  }, [wsMessages, selectedDate, selectedTime, selectedDuration, fetchAvailableMachines]);

  // Check availability when date, time, or duration changes
  React.useEffect(() => {
    if (selectedDate && selectedTime && selectedDuration) {
      fetchAvailableMachines(selectedDate, selectedTime, selectedDuration);
    }
  }, [selectedDate, selectedTime, selectedDuration, fetchAvailableMachines]);

  // Fetch all machines on component mount (without availability filter)
  React.useEffect(() => {
    const fetchAllMachines = async () => {
      try {
        setMachinesLoading(true);
        const response = await fetch('/api/dialysis/machines');
        if (response.ok) {
          const machineData = await response.json();
          
          // Debug: Log machine statuses from backend
          console.log('🔧 Machine statuses from backend:', machineData.map(m => ({
            name: m.machineName,
            status: m.status,
            type: m.machineType,
            location: m.location
          })));
          
          const transformedMachines = machineData.map(machine => ({
            id: machine.machineId,
            name: machine.machineName,
            status: machine.status.toLowerCase(),
            type: machine.machineType,
            location: machine.location
          }));
          
          setMachines(transformedMachines);
          
          // Log summary of machine statuses
          const statusCounts = transformedMachines.reduce((counts, machine) => {
            counts[machine.status] = (counts[machine.status] || 0) + 1;
            return counts;
          }, {});
          console.log('📊 Machine status summary:', statusCounts);
          
        } else {
          console.error('Failed to fetch machines - HTTP', response.status);
          setMachines([]);
        }
      } catch (error) {
        console.error('Error fetching machines:', error);
        setMachines([]);
      } finally {
        setMachinesLoading(false);
      }
    };
    
    fetchAllMachines();
  }, []);

  const dialysisTypes = [
    { value: 'hemodialysis', label: 'Hemodialysis', duration: '4 hours' },
    { value: 'peritoneal_dialysis', label: 'Peritoneal Dialysis', duration: '8-10 hours' },
    { value: 'continuous_renal_replacement', label: 'CRRT', duration: '24 hours' },
    { value: 'hemodiafiltration', label: 'Hemodiafiltration', duration: '4-5 hours' }
  ];

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Filter transferred patients and remove duplicates
  const filteredPatients = useMemo(() => {
    // First remove duplicates based on patientNationalId
    const uniquePatients = dialysisPatients.reduce((unique, patient) => {
      const existingIndex = unique.findIndex(p => p.patientNationalId === patient.patientNationalId);
      if (existingIndex === -1) {
        unique.push(patient);
      } else {
        // Keep the most recent one (if transferDate is available)
        if (patient.transferDate && (!unique[existingIndex].transferDate || 
            new Date(patient.transferDate) > new Date(unique[existingIndex].transferDate))) {
          unique[existingIndex] = patient;
        }
      }
      return unique;
    }, []);

    return uniquePatients.filter(patient => {
      const matchesSearch = !searchTerm || 
        patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patientNationalId?.includes(searchTerm);
      
      const hasSession = existingSessions.some(session => 
        session.patientNationalId === patient.patientNationalId
      );
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'scheduled' && hasSession) ||
        (filterStatus === 'unscheduled' && !hasSession);
      
      return matchesSearch && matchesStatus;
    });
  }, [dialysisPatients, searchTerm, filterStatus, existingSessions]);

  const getPatientScheduleStatus = (patient) => {
    const hasSession = existingSessions.some(session => 
      session.patientNationalId === patient.patientNationalId
    );
    return hasSession ? 'scheduled' : 'unscheduled';
  };

  const ScheduleModal = () => {
    const [formData, setFormData] = useState({
      date: selectedDate,
      startTime: selectedTime || '08:00',
      duration: selectedDuration || '4',
      dialysisType: 'hemodialysis',
      machineId: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!selectedPatient || !formData.machineId) {
        alert('Please select a patient and machine');
        return;
      }

      // Enhanced validation with conflict checking
      const selectedMachine = availableMachines.find(m => m.id === formData.machineId);
      if (!selectedMachine) {
        alert('Selected machine is no longer available. Please choose a different machine or time slot.');
        return;
      }
      
      // Double-check for time conflicts before submission
      const requestedStart = new Date(`${formData.date}T${formData.startTime}`);
      const requestedEnd = new Date(requestedStart.getTime() + (parseInt(formData.duration) * 60 * 60 * 1000));
      
      const conflictingSession = existingSessions.find(session => {
        if (session.machineId !== formData.machineId || 
            session.scheduledDate !== formData.date || 
            session.status === 'completed' || 
            session.status === 'cancelled') {
          return false;
        }
        
        const sessionStart = new Date(`${session.scheduledDate}T${session.startTime}`);
        const sessionDuration = parseFloat(session.duration) || 4;
        const sessionEnd = new Date(sessionStart.getTime() + (sessionDuration * 60 * 60 * 1000));
        
        return (requestedStart < sessionEnd && requestedEnd > sessionStart);
      });
      
      if (conflictingSession) {
        alert(`⚠️ Machine Conflict Detected!\n\n${selectedMachine.name} is already scheduled for:\n• Patient: ${conflictingSession.patientName}\n• Time: ${conflictingSession.startTime} - ${conflictingSession.endTime}\n• Status: ${conflictingSession.status}\n\nPlease select a different machine or time slot.`);
        return;
      }

      // Calculate end time based on start time and duration
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const startMinute = parseInt(formData.startTime.split(':')[1]);
      const durationHours = parseInt(formData.duration);
      const endHour = (startHour + durationHours) % 24;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

      const sessionData = {
        patientNationalId: selectedPatient.patientNationalId,
        patientName: selectedPatient.patientName,
        admissionId: selectedPatient.admissionId,
        scheduledDate: formData.date,
        startTime: formData.startTime,
        endTime: endTime,
        duration: `${formData.duration}h 0m`,
        sessionType: formData.dialysisType.toUpperCase(), // Map dialysisType to sessionType
        machineId: formData.machineId,
        status: 'SCHEDULED', // Uppercase enum
        attendance: 'PENDING' // Uppercase enum
      };

      console.log('✅ Creating conflict-free dialysis session:', {
        machine: selectedMachine.name,
        patient: selectedPatient.patientName,
        timeSlot: `${formData.date} ${formData.startTime} - ${endTime}`,
        duration: `${formData.duration}h`,
        verifiedNoConflicts: true
      });

      onScheduleSession(sessionData);
      setShowScheduleModal(false);
      setSelectedPatient(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Schedule Dialysis Session
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {selectedPatient && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{selectedPatient.patientName}</p>
                    <p className="text-sm text-blue-700">ID: {selectedPatient.patientNationalId}</p>
                    <p className="text-sm text-blue-700">Ward: {selectedPatient.wardName} - Bed {selectedPatient.bedNumber}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Session Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, date: e.target.value }));
                    setSelectedDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start Time
                </label>
                <select
                  value={formData.startTime}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, startTime: e.target.value }));
                    setSelectedTime(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Dialysis Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Activity className="w-4 h-4 inline mr-1" />
                  Dialysis Type
                </label>
                <select
                  value={formData.dialysisType}
                  onChange={(e) => {
                    const selectedType = dialysisTypes.find(type => type.value === e.target.value);
                    const durationHours = selectedType?.duration.match(/\d+/)[0] || '4';
                    setFormData(prev => ({ 
                      ...prev, 
                      dialysisType: e.target.value,
                      duration: durationHours
                    }));
                    setSelectedDuration(durationHours);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {dialysisTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.duration})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.duration}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, duration: e.target.value }));
                    setSelectedDuration(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Enhanced Machine Selection with Conflict Prevention */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Settings className="w-4 h-4 inline mr-1" />
                  Machine Assignment
                  {selectedDate && selectedTime && selectedDuration && (
                    <span className="text-xs text-gray-600 ml-2">
                      ({selectedDate} {selectedTime} - {String(parseInt(selectedTime.split(':')[0]) + parseInt(selectedDuration)).padStart(2, '0')}:{selectedTime.split(':')[1]})
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {machinesLoading ? (
                    <div className="col-span-full text-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-blue-600 font-medium">Checking machine availability...</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedDate && selectedTime && selectedDuration ? 
                          `Verifying no conflicts for ${selectedDate} at ${selectedTime} (${selectedDuration}h)` : 
                          'Please select date, time and duration'
                        }
                      </p>
                    </div>
                  ) : availableMachines.length > 0 ? (
                    <>
                      {/* Available Machines */}
                      {availableMachines.map(machine => (
                        <label key={machine.id} className="cursor-pointer">
                          <input
                            type="radio"
                            name="machine"
                            value={machine.id}
                            checked={formData.machineId === machine.id}
                            onChange={(e) => setFormData(prev => ({ ...prev, machineId: e.target.value }))}
                            className="sr-only"
                          />
                          <div className={`p-3 border-2 rounded-lg transition-all ${
                            formData.machineId === machine.id
                              ? 'border-green-500 bg-green-50 shadow-md'
                              : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-gray-900">{machine.name}</div>
                              <div className="flex items-center space-x-2">
                                <CheckCircle className={`w-4 h-4 ${
                                  formData.machineId === machine.id ? 'text-green-600' : 'text-gray-300'
                                }`} />
                                {/* Real-time status indicator */}
                                <div className={`w-2 h-2 rounded-full ${
                                  machine.isOperational && machine.isRealTimeAvailable 
                                    ? 'bg-green-400' 
                                    : 'bg-orange-400'
                                }`} />
                              </div>
                            </div>
                            <div className="text-xs text-green-600 font-medium mb-1">✓ Available - No Conflicts</div>
                            <div className="text-xs text-gray-500 mb-1">{machine.location}</div>
                            <div className="text-xs text-gray-600">Status: {machine.statusReason}</div>
                            <div className="text-xs text-blue-600 mt-2 bg-blue-50 rounded p-1">
                              {selectedTime && selectedDuration ? 
                                `${selectedTime} - ${String(parseInt(selectedTime.split(':')[0]) + parseInt(selectedDuration)).padStart(2, '0')}:${selectedTime.split(':')[1]}` : 
                                'Ready for scheduling'
                              }
                            </div>
                          </div>
                        </label>
                      ))}
                      
                      {/* Show Conflicted Machines for Reference */}
                      {machines.filter(m => !m.isAvailable && m.conflictDetails?.length > 0).length > 0 && (
                        <div className="col-span-full mt-4">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            ⚠️ Machines with Time Conflicts (Not Available)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {machines.filter(m => !m.isAvailable && m.conflictDetails?.length > 0).map(machine => (
                              <div key={machine.id} className="p-3 border-2 border-red-200 bg-red-50 rounded-lg opacity-60">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-sm font-medium text-gray-900">{machine.name}</div>
                                  <div className="flex items-center space-x-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      machine.hasTimeConflicts
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : !machine.isOperational
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {machine.hasTimeConflicts ? 'Scheduled' :
                                       !machine.isOperational ? machine.status.toUpperCase() : 'In Use'}
                                    </span>
                                    <div className={`w-2 h-2 rounded-full ${
                                      machine.hasTimeConflicts ? 'bg-yellow-400' :
                                      !machine.isOperational ? 'bg-red-400' : 'bg-orange-400'
                                    }`} />
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 mb-2">{machine.location}</div>
                                <div className="text-xs text-red-600 font-medium mb-2">
                                  {machine.hasTimeConflicts ? 
                                    `❌ Time Conflict (${machine.conflictCount})` :
                                    `❌ ${machine.statusReason}`
                                  }
                                </div>
                                {machine.conflictDetails.map((conflict, index) => (
                                  <div key={index} className="text-xs text-red-700 bg-red-100 rounded p-1 mb-1">
                                    <div className="font-medium">{conflict.patientName}</div>
                                    <div>{conflict.startTime} - {conflict.endTime}</div>
                                    <div className="text-red-600">({conflict.status})</div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (selectedDate && selectedTime && selectedDuration) ? (
                    <div className="col-span-full">
                      <div className="text-center py-6 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-600 font-medium">No machines available for this time slot</p>
                        <p className="text-sm text-red-500 mt-1">
                          {selectedDate} at {selectedTime} ({selectedDuration}h duration)
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          All machines have scheduling conflicts during this time
                        </p>
                      </div>
                      
                      {/* Show all machines with their conflicts */}
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Machine Status for Selected Time:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {machines.map(machine => (
                          <div key={machine.id} className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{machine.name}</span>
                              <span className="text-xs text-red-600">Conflicted</span>
                            </div>
                            {machine.conflictDetails?.map((conflict, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-white rounded p-1 mb-1">
                                <div>{conflict.patientName} - {conflict.startTime} to {conflict.endTime}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">💡 Suggestions:</p>
                        <ul className="text-xs text-blue-700 mt-1 space-y-1">
                          <li>• Try a different time slot (06:00, 10:00, 14:00, 18:00, 22:00)</li>
                          <li>• Reduce session duration if possible</li>
                          <li>• Schedule for a different date</li>
                          <li>• Check if any existing sessions can be rescheduled</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-full text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
                      <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Select date, time and duration</p>
                      <p className="text-xs text-gray-500 mt-1">
                        to check machine availability and conflicts
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={availableMachines.length === 0 || !formData.machineId}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  availableMachines.length === 0 || !formData.machineId
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title={
                  availableMachines.length === 0
                    ? 'No machines available for selected time slot'
                    : !formData.machineId
                    ? 'Please select an available machine'
                    : 'Schedule this dialysis session'
                }
              >
                <Save className="w-4 h-4" />
                <span>
                  {availableMachines.length === 0 
                    ? 'No Machines Available' 
                    : !formData.machineId
                    ? 'Select Machine First'
                    : 'Schedule Session'
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading patients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Machine Status Overview with Conflict Detection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Dialysis Machines Status</h3>
          <div className="flex items-center space-x-4">
            {/* Real-time connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-gray-600">
                {connectionStatus === 'connected' ? 'Live Updates' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedDate && selectedTime && selectedDuration ? (
                <span>For {selectedDate} at {selectedTime} ({selectedDuration}h)</span>
              ) : (
                <span>Total: {machines.length} machines</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Machine Status Summary */}
        {machines.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Machine Status Summary:</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {(() => {
                const statusCounts = machines.reduce((counts, machine) => {
                  const status = machine.status;
                  counts[status] = (counts[status] || 0) + 1;
                  return counts;
                }, {});
                
                return Object.entries(statusCounts).map(([status, count]) => {
                  const displayStatus = {
                    'active': 'Active',
                    'maintenance': 'Under Maintenance', 
                    'out_of_order': 'Out of Order',
                    'offline': 'Offline',
                    'cleaning': 'Cleaning',
                    'calibration': 'Calibration'
                  }[status] || status.charAt(0).toUpperCase() + status.slice(1);
                  
                  const colorClass = {
                    'active': 'text-green-700 bg-green-100',
                    'maintenance': 'text-blue-700 bg-blue-100',
                    'out_of_order': 'text-red-700 bg-red-100',
                    'offline': 'text-red-700 bg-red-100',
                    'cleaning': 'text-blue-700 bg-blue-100',
                    'calibration': 'text-blue-700 bg-blue-100'
                  }[status] || 'text-gray-700 bg-gray-100';
                  
                  return (
                    <span key={status} className={`px-2 py-1 rounded font-medium ${colorClass}`}>
                      {displayStatus}: {count}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {machines.map(machine => {
            // Calculate current session conflicts for the selected time
            const currentSessions = existingSessions.filter(session => 
              session.machineId === machine.id && 
              session.scheduledDate === selectedDate &&
              session.status !== 'completed' &&
              session.status !== 'cancelled'
            );
            
            // Check for time conflicts if time is selected
            let hasTimeConflict = false;
            let conflictingSession = null;
            
            if (selectedTime && selectedDuration) {
              const requestedStart = new Date(`${selectedDate}T${selectedTime}`);
              const requestedEnd = new Date(requestedStart.getTime() + (parseInt(selectedDuration) * 60 * 60 * 1000));
              
              conflictingSession = currentSessions.find(session => {
                const sessionStart = new Date(`${session.scheduledDate}T${session.startTime}`);
                const sessionDuration = parseFloat(session.duration) || 4;
                const sessionEnd = new Date(sessionStart.getTime() + (sessionDuration * 60 * 60 * 1000));
                
                return (requestedStart < sessionEnd && requestedEnd > sessionStart);
              });
              
              hasTimeConflict = !!conflictingSession;
            }
            
            const isOccupied = currentSessions.length > 0;
            const isAvailable = !hasTimeConflict && machine.status === 'active';
            
            // Enhanced status display with proper formatting
            const getStatusDisplay = () => {
              if (hasTimeConflict) return 'Time Conflict';
              if (isAvailable) return 'Available';
              
              // Handle different machine statuses
              switch (machine.status) {
                case 'maintenance':
                  return 'Under Maintenance';
                case 'out_of_order':
                  return 'Out of Order';
                case 'offline':
                  return 'Offline';
                case 'cleaning':
                  return 'Being Cleaned';
                case 'calibration':
                  return 'In Calibration';
                default:
                  return machine.status.charAt(0).toUpperCase() + machine.status.slice(1);
              }
            };
            
            // Enhanced status color based on machine condition
            const getStatusColor = () => {
              if (hasTimeConflict) return 'text-red-600';
              if (isAvailable) return 'text-green-600';
              
              // Different colors for different maintenance statuses
              switch (machine.status) {
                case 'maintenance':
                case 'cleaning':
                case 'calibration':
                  return 'text-blue-600'; // Blue for scheduled maintenance
                case 'out_of_order':
                case 'offline':
                  return 'text-red-600'; // Red for broken/unavailable
                default:
                  return 'text-yellow-600'; // Yellow for other statuses
              }
            };
            
            // Enhanced border color based on status
            const getBorderColor = () => {
              if (hasTimeConflict) return 'border-red-300 bg-red-50';
              if (isAvailable) return 'border-green-300 bg-green-50';
              
              switch (machine.status) {
                case 'maintenance':
                case 'cleaning':
                case 'calibration':
                  return 'border-blue-300 bg-blue-50';
                case 'out_of_order':
                case 'offline':
                  return 'border-red-300 bg-red-50';
                default:
                  return 'border-yellow-300 bg-yellow-50';
              }
            };
            
            // Enhanced indicator color
            const getIndicatorColor = () => {
              if (hasTimeConflict) return 'bg-red-500';
              if (isAvailable) return 'bg-green-500';
              
              switch (machine.status) {
                case 'maintenance':
                case 'cleaning':
                case 'calibration':
                  return 'bg-blue-500';
                case 'out_of_order':
                case 'offline':
                  return 'bg-red-500';
                default:
                  return 'bg-yellow-500';
              }
            };
            
            return (
              <div key={machine.id} className={`p-4 rounded-lg border-2 transition-all ${getBorderColor()}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{machine.name}</h4>
                    <p className={`text-sm font-medium ${getStatusColor()}`}>
                      {getStatusDisplay()}
                    </p>
                    {/* Show additional status info for maintenance machines */}
                    {(machine.status === 'maintenance' || machine.status === 'out_of_order') && (
                      <p className="text-xs text-gray-500 mt-1">
                        {machine.status === 'maintenance' 
                          ? 'Scheduled maintenance in progress' 
                          : 'Machine requires repair before use'
                        }
                      </p>
                    )}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getIndicatorColor()}`}></div>
                </div>
                
                {/* Show conflict details */}
                {hasTimeConflict && conflictingSession && (
                  <div className="text-xs text-red-700 bg-red-100 rounded p-2">
                    <div className="font-medium">Conflicting Session:</div>
                    <div>{conflictingSession.patientName}</div>
                    <div>{conflictingSession.startTime} - {conflictingSession.endTime || 'Ongoing'}</div>
                  </div>
                )}
                
                {/* Show current sessions if any */}
                {!hasTimeConflict && isOccupied && currentSessions[0] && (
                  <div className="text-xs text-gray-600 bg-gray-100 rounded p-2">
                    <div className="font-medium">Current Session:</div>
                    <div>{currentSessions[0].patientName}</div>
                    <div>{currentSessions[0].startTime} - {currentSessions[0].endTime || 'Ongoing'}</div>
                  </div>
                )}
                
                {/* Enhanced status details for non-available machines */}
                {!isAvailable && !hasTimeConflict && (
                  <div className={`text-xs rounded p-2 mt-2 ${
                    machine.status === 'maintenance' || machine.status === 'cleaning' || machine.status === 'calibration'
                      ? 'text-blue-700 bg-blue-100'
                      : machine.status === 'out_of_order' || machine.status === 'offline'
                      ? 'text-red-700 bg-red-100'
                      : 'text-yellow-700 bg-yellow-100'
                  }`}>
                    <div className="font-medium">
                      {machine.status === 'maintenance' && '🔧 Maintenance Mode'}
                      {machine.status === 'out_of_order' && '❌ Equipment Failure'}
                      {machine.status === 'offline' && '🔌 System Offline'}
                      {machine.status === 'cleaning' && '🧽 Cleaning Cycle'}
                      {machine.status === 'calibration' && '⚙️ Calibration'}
                      {!['maintenance', 'out_of_order', 'offline', 'cleaning', 'calibration'].includes(machine.status) && 
                        `ℹ️ Status: ${machine.status}`}
                    </div>
                    <div className="mt-1">
                      {machine.status === 'maintenance' && 'Scheduled maintenance in progress'}
                      {machine.status === 'out_of_order' && 'Machine requires repair before use'}
                      {machine.status === 'offline' && 'System is currently offline'}
                      {machine.status === 'cleaning' && 'Cleaning and disinfection cycle'}
                      {machine.status === 'calibration' && 'Equipment calibration procedure'}
                      {!['maintenance', 'out_of_order', 'offline', 'cleaning', 'calibration'].includes(machine.status) && 
                        'Machine is temporarily unavailable'}
                    </div>
                    {machine.location && (
                      <div className="text-xs text-gray-600 mt-1">Location: {machine.location}</div>
                    )}
                  </div>
                )}
                
                {/* Show available time info */}
                {isAvailable && selectedTime && selectedDuration && (
                  <div className="text-xs text-green-700 bg-green-100 rounded p-2 mt-2">
                    <div className="font-medium">Available for:</div>
                    <div>{selectedTime} - {String(parseInt(selectedTime.split(':')[0]) + parseInt(selectedDuration)).padStart(2, '0')}:{selectedTime.split(':')[1]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Enhanced Machine Availability Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Available for selected time</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Time conflict / Out of order</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Under maintenance / Cleaning</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Other status</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transferred patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Patients</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {filteredPatients.length} transferred patients • 
            {filteredPatients.filter(p => getPatientScheduleStatus(p) === 'unscheduled').length} awaiting manual scheduling
          </div>
        </div>
      </div>

      {/* Transferred Patients List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Transferred Patients - Schedule Dialysis Sessions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Patients transferred from Ward Management ready for dialysis scheduling
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient, index) => {
              const scheduleStatus = getPatientScheduleStatus(patient);
              const existingSession = existingSessions.find(session => 
                session.patientNationalId === patient.patientNationalId
              );
              
              // Create a unique key combining multiple identifiers
              const uniqueKey = `${patient.patientNationalId}_${patient.admissionId || index}_${patient.wardId || 'default'}`;
              
              return (
                <div key={uniqueKey} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {patient.patientName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {patient.patientName}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>ID: {patient.patientNationalId}</span>
                          <span>Ward: {patient.wardName}</span>
                          <span>Bed: {patient.bedNumber}</span>
                          <span>Admission: #{patient.admissionId}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          Transferred: {new Date(patient.transferDate || Date.now()).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {scheduleStatus === 'scheduled' ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Scheduled</span>
                          </div>
                          {existingSession && (
                            <div className="text-sm text-gray-600">
                              <p>{new Date(existingSession.scheduledDate).toLocaleDateString()}</p>
                              <p>{existingSession.startTime} - {existingSession.dialysisType}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-orange-600">
                          <AlertCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Needs Scheduling</span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowScheduleModal(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{scheduleStatus === 'scheduled' ? 'Reschedule' : 'Schedule'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Transferred Patients
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No patients match your search criteria.' 
                  : 'Waiting for patients to be transferred from Ward Management.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && <ScheduleModal />}
    </div>
  );
}