import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import useDialysisWebSocket from './useDialysisWebSocket';

const useDialysisSessions = (showToast) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialysisPatients, setDialysisPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Memoize showToast to prevent infinite loops
  const toastRef = useRef(showToast);
  
  // Update ref when showToast changes
  useEffect(() => {
    toastRef.current = showToast;
  }, [showToast]);

  // Helper function for showing toasts
  const showToastSafe = useCallback((type, title, message) => {
    if (toastRef.current && typeof toastRef.current === 'function') {
      toastRef.current(type, title, message);
    }
  }, []);

  // Real-time WebSocket integration
  const handleDialysisUpdate = useCallback((data) => {
    console.log('🔄 Real-time dialysis update received:', data);
    
    if (data.type === 'PATIENT_TRANSFERRED_TO_DIALYSIS') {
      // A new patient was transferred to dialysis ward
      if (data.newAdmission) {
        setDialysisPatients(prev => {
          const existing = prev.find(p => p.admissionId === data.newAdmission.admissionId);
          if (!existing) {
            console.log('✅ Adding new transferred patient (awaiting schedule):', data.newAdmission.patientName);
            return [data.newAdmission, ...prev];
          }
          return prev;
        });

        // NOTE: Removed auto-scheduling - patients now remain in "awaiting schedule" status
        // They must be manually scheduled using the SessionScheduler interface

        // Show toast notification for transferred patient
        if (toastRef.current && typeof toastRef.current === 'function') {
          toastRef.current('info', 'New Patient Transfer', 
            `${data.newAdmission.patientName} has been transferred to Dialysis ward and is awaiting schedule`);
        }
      }
    }
  }, []); // Stable callback with no dependencies

  // Enhanced machine status management functions - moved to top for hoisting
  const updateMachineStatus = useCallback(async (machineId, status, reason = '') => {
    // Skip machine status updates entirely until backend implements the endpoint
    // This prevents console errors and provides cleaner development experience
    console.log(`ℹ️ Machine status update requested for ${machineId} -> ${status} (skipped - endpoint not available)`, { reason });
    return { success: false, reason: 'Endpoint not implemented' };
    
    /* 
    // Original implementation - uncomment when backend implements machine status API
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.patch(
        `/api/dialysis/machines/${machineId}/status`,
        { 
          status: status,
          reason: reason,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`🔄 Machine ${machineId} status updated to: ${status}`, { reason, timestamp: new Date().toISOString() });
      return response.data;
    } catch (error) {
      // Handle different error scenarios gracefully
      if (error.response?.status === 404) {
        console.log(`ℹ️ Machine status endpoint not implemented yet for ${machineId}. Skipping status update.`);
        return { success: false, reason: 'Endpoint not implemented' };
      } else if (error.response?.status === 500) {
        console.log(`ℹ️ Backend machine status API not available for ${machineId}. Continuing without status update.`);
        return { success: false, reason: 'Backend error' };
      } else {
        console.error(`❌ Failed to update machine ${machineId} status to ${status}:`, error);
        return { success: false, reason: error.message };
      }
    }
    */
  }, []);

  const {
    isConnected: wsConnected,
    error: wsError,
    notifications: wsNotifications,
    transferredPatients: wsTransferredPatients,
    getTransferredPatientsCount,
    requestDialysisUpdate
  } = useDialysisWebSocket(handleDialysisUpdate);

  // Real API calls - no mock data

  const fetchSessions = useCallback(async (silent = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Real API call to fetch dialysis sessions
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.get('/api/dialysis/sessions', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      setSessions(response.data);
      
      if (showToastSafe && !silent) {
        showToastSafe('success', 'Sessions Loaded', 'Dialysis sessions loaded successfully');
      }
    } catch (error) {
      console.error('Error fetching dialysis sessions:', error);
      setError(error.message);
      
      if (showToastSafe && !silent) {
        showToastSafe('error', 'Load Failed', 'Failed to load dialysis sessions');
      }
    } finally {
      setLoading(false);
    }
  }, [showToastSafe]);  const updateSession = useCallback(async (sessionId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Real API call to update session
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.put(`/api/dialysis/sessions/${sessionId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state with response
      setSessions(prev => prev.map(session => 
        session.sessionId === sessionId 
          ? { ...session, ...response.data }
          : session
      ));
      
      if (showToastSafe) {
        showToastSafe('success', 'Session Updated', 'Session details updated successfully');
      }
    } catch (error) {
      console.error('Error updating dialysis session:', error);
      setError(error.message);
      
      if (showToastSafe) {
        showToastSafe('error', 'Update Failed', 'Failed to update session');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToastSafe]);

  const markAttendance = useCallback(async (sessionId, attendanceStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      // Real API call to update attendance
      const jwtToken = localStorage.getItem('jwtToken');
      await axios.patch(`/api/dialysis/sessions/${sessionId}/attendance`, 
        { attendance: attendanceStatus }, 
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state
      setSessions(prev => prev.map(session => 
        session.sessionId === sessionId 
          ? { ...session, attendance: attendanceStatus }
          : session
      ));
      
      if (showToastSafe) {
        showToastSafe('success', 'Attendance Updated', `Patient marked as ${attendanceStatus}`);
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      setError(error.message);

      if (showToastSafe) {
        showToastSafe('error', 'Update Failed', 'Failed to update attendance');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToastSafe]);

  const addSessionDetails = useCallback(async (sessionId, detailsData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find the session to get machine info
      const session = sessions.find(s => s.sessionId === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      // Step 1: Update session details
      console.log('📝 Updating session details...', { sessionId, detailsData });
      await axios.patch(`/api/dialysis/sessions/${sessionId}/details`, 
        detailsData, 
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const isSessionCompleted = detailsData.actualEndTime;
      
      // Step 2: Update machine status when session is completed
      if (isSessionCompleted && session.machineId) {
        const machineUpdateResult = await updateMachineStatus(
          session.machineId, 
          'ACTIVE', 
          `Session completed for patient: ${session.patientName} at ${detailsData.actualEndTime}`
        );
        
        if (machineUpdateResult.success !== false) {
          console.log(`✅ Session completed and machine ${session.machineId} released back to ACTIVE status`);
          
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Completed & Machine Released', 
              `Session details saved. Machine ${session.machineId} is now available for scheduling.`
            );
          }
        } else {
          console.log(`ℹ️ Session completed successfully. Machine status update skipped (${machineUpdateResult.reason}).`);
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Completed Successfully', 
              `Session details saved successfully.`
            );
          }
        }
      } else if (showToastSafe) {
        showToastSafe('success', 'Details Saved', 'Session details saved successfully');
      }
      
      // Step 3: Update local state
      setSessions(prev => prev.map(s => 
        s.sessionId === sessionId 
          ? { 
              ...s, 
              ...detailsData,
              status: isSessionCompleted ? 'COMPLETED' : s.status
            }
          : s
      ));
      
    } catch (error) {
      console.error('❌ Error adding session details:', error);
      setError(error.message);

      if (showToastSafe) {
        showToastSafe('error', 'Save Failed', 'Failed to save session details');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToastSafe, sessions, updateMachineStatus]);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);

      // Find the session to get machine info before deletion
      const session = sessions.find(s => s.sessionId === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const jwtToken = localStorage.getItem('jwtToken');
      
      // Step 1: Delete the session
      console.log('🗑️ Deleting dialysis session...', { sessionId, machineId: session.machineId });
      await axios.delete(`/api/dialysis/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Step 2: Release machine back to ACTIVE status
      if (session.machineId && session.status !== 'COMPLETED') {
        const machineUpdateResult = await updateMachineStatus(
          session.machineId, 
          'ACTIVE', 
          `Session cancelled/deleted for patient: ${session.patientName}`
        );
        
        if (machineUpdateResult.success !== false) {
          console.log(`✅ Session deleted and machine ${session.machineId} released back to ACTIVE status`);
          
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Deleted & Machine Released', 
              `Session removed. Machine ${session.machineId} is now available for scheduling.`
            );
          }
        } else {
          console.log(`ℹ️ Session deleted successfully. Machine status update skipped (${machineUpdateResult.reason}).`);
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Deleted Successfully', 
              `Session removed from schedule.`
            );
          }
        }
      } else if (showToastSafe) {
        showToastSafe('success', 'Session Deleted', 'Session deleted successfully');
      }

      // Step 3: Update local state
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));

    } catch (error) {
      console.error('❌ Error deleting dialysis session:', error);
      setError(error.message);

      if (showToastSafe) {
        showToastSafe('error', 'Delete Failed', 'Failed to delete session');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToastSafe, sessions, updateMachineStatus]);

  // Fetch current dialysis patients from Ward 4 (Dialysis Ward)
  const fetchDialysisPatients = useCallback(async () => {
    try {
      setPatientsLoading(true);
      setError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Fetch patients currently admitted to Ward 4 (Dialysis Ward)
      const response = await axios.get('/api/admissions/ward/4', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Transform admission data to dialysis patient format
      const transformedPatients = response.data.map(admission => ({
        patientId: admission.patientNationalId,
        patientName: admission.patientName,
        patientNationalId: admission.patientNationalId,
        admissionId: admission.admissionId,
        bedNumber: admission.bedNumber,
        admissionDate: admission.admissionDate,
        wardName: admission.wardName,
        status: admission.status
      }));

      setDialysisPatients(transformedPatients);
      
      if (showToastSafe && transformedPatients.length > 0) {
        showToastSafe('success', 'Patients Loaded', `Found ${transformedPatients.length} patients in Dialysis Ward`);
      }

      return transformedPatients;
    } catch (error) {
      console.error('Error fetching dialysis patients:', error);

      let errorMessage = 'Failed to load dialysis patients. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view dialysis patients.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);

      if (showToastSafe) {
        showToastSafe('error', 'Load Failed', errorMessage);
      }

      throw error;
    } finally {
      setPatientsLoading(false);
    }
  }, [showToastSafe]);

  // Create a new dialysis session
  // Check machine availability for specific date and time
  const checkMachineAvailability = useCallback(async (date, startTime, duration) => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.get(
        `/api/dialysis/machines/available-for-time`,
        {
          params: {
            date: date,
            startTime: startTime,
            duration: duration
          },
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error checking machine availability:', error);
      throw error;
    }
  }, []);

  // Get all machines with their availability status
  const getMachinesWithAvailability = useCallback(async (date, startTime, duration) => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.get(
        `/api/dialysis/machines/availability-status`,
        {
          params: {
            date: date,
            startTime: startTime,
            duration: duration
          },
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching machines with availability:', error);
      throw error;
    }
  }, []);

  const createSession = useCallback(async (sessionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      // Step 1: Create the session
      console.log('📝 Creating dialysis session...', sessionData);
      const response = await axios.post('/api/dialysis/sessions', sessionData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const newSession = response.data;
      console.log('✅ Session created successfully:', newSession);
      
      // Step 2: Update machine status to IN_USE when session is scheduled
      if (sessionData.machineId && sessionData.status === 'SCHEDULED') {
        const machineUpdateResult = await updateMachineStatus(
          sessionData.machineId, 
          'IN_USE', 
          `Scheduled for patient: ${sessionData.patientName} at ${sessionData.startTime}`
        );
        
        if (machineUpdateResult.success !== false) {
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Scheduled & Machine Reserved', 
              `${sessionData.patientName} scheduled for ${sessionData.startTime}. Machine ${sessionData.machineId} reserved.`
            );
          }
        } else {
          console.log(`ℹ️ Session created successfully. Machine status update skipped (${machineUpdateResult.reason}).`);
          if (showToastSafe) {
            showToastSafe(
              'success', 
              'Session Scheduled Successfully', 
              `${sessionData.patientName} scheduled for ${sessionData.startTime} on ${sessionData.machineId}.`
            );
          }
        }
      }
      
      // Step 3: Add new session to local state
      setSessions(prev => [newSession, ...prev]);
      
      return newSession;
    } catch (error) {
      console.error('❌ Error creating dialysis session:', error);
      setError(error.message);

      if (showToastSafe) {
        showToastSafe('error', 'Create Failed', 'Failed to create session');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToastSafe, updateMachineStatus]);

  // Load dialysis patients on component mount
  useEffect(() => {
    const loadDialysisData = async () => {
      try {
        // Load existing sessions from API
        await fetchSessions(true); // silent mode
        
        // Load current dialysis patients
        await fetchDialysisPatients();
      } catch (error) {
        console.error('Failed to load dialysis data:', error);
        setSessions([]);
      }
    };
    
    loadDialysisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    sessions,
    loading,
    error,
    dialysisPatients,
    patientsLoading,
    
    // WebSocket status and data
    wsConnected,
    wsError,
    wsNotifications,
    wsTransferredPatients,
    
    // Functions
    fetchSessions,
    fetchDialysisPatients,
    createSession,
    updateSession,
    markAttendance,
    addSessionDetails,
    deleteSession,
    
    // Machine management functions
    updateMachineStatus,
    checkMachineAvailability,
    getMachinesWithAvailability,
    
    // WebSocket functions
    getTransferredPatientsCount,
    requestDialysisUpdate
  };
};

export default useDialysisSessions;
