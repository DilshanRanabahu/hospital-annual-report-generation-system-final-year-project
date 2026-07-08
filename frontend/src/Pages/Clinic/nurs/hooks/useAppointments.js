import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useAppointments = (showToast = null) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const transformAppointmentData = (apiAppointment) => ({
    id: apiAppointment.appointmentId,
    appointmentId: apiAppointment.appointmentId,
    doctorEmployeeId: apiAppointment.doctorEmployeeId,
    doctorName: apiAppointment.doctorName,
    doctorSpecialization: apiAppointment.doctorSpecialization,
    patientNationalId: apiAppointment.patientNationalId,
    patientName: apiAppointment.patientName,
    date: apiAppointment.appointmentDate,
    time: apiAppointment.appointmentTime,
    status: apiAppointment.status.toLowerCase(),
    createdAt: apiAppointment.createdAt
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        setAppointments([]);
        return;
      }

      const response = await axios.get('/api/appointments/getAll', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // The API returns an array directly
      if (Array.isArray(response.data)) {
        const transformedAppointments = response.data.map(transformAppointmentData);
        setAppointments(transformedAppointments);
      } else {
        console.warn('Unexpected API response structure:', response.data);
        setAppointments([]);
      }
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', 'Your session has expired. Please log in again.');
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', 'You do not have permission to view appointments.');
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', 'Server error occurred. Please try again later.');
        } else {
          showToast('error', 'Loading Failed', 'Failed to load appointments data.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const createAppointment = useCallback(async (appointmentData) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      const requestData = {
        doctorEmployeeId: appointmentData.doctorEmployeeId,
        patientNationalId: appointmentData.patientNationalId,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime
      };

      const response = await axios.post('/api/appointments/create', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Transform the response to match the expected format
      const newAppointment = transformAppointmentData(response.data);
      
      // Add the new appointment to the current list
      setAppointments(prev => [...prev, newAppointment]);
      
      if (showToast) {
        showToast('success', 'Success', 'Appointment scheduled successfully!');
      }
      
      return newAppointment;
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      if (showToast) {
        if (error.response) {
          if (error.response.status === 401) {
            showToast('error', 'Authentication Failed', 'Please log in again.');
          } else if (error.response.status === 403) {
            showToast('error', 'Access Denied', 'You do not have permission to create appointments.');
          } else if (error.response.status === 409) {
            showToast('error', 'Conflict', 'An appointment already exists for this time slot.');
          } else if (error.response.status === 400) {
            const errorMessage = error.response.data?.message || 'Invalid appointment data provided';
            showToast('warning', 'Invalid Data', errorMessage);
          } else if (error.response.status === 404) {
            showToast('error', 'Not Found', 'Doctor or patient not found.');
          } else {
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            showToast('error', 'Server Error', `Failed to create appointment: ${errorMessage}`);
          }
        } else if (error.request) {
          showToast('error', 'Network Error', 'Failed to create appointment. Please check your connection and try again.');
        } else {
          showToast('error', 'Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [showToast]);

  const updateAppointment = useCallback(async (appointmentId, appointmentData) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      await axios.put(`/api/appointments/update/${appointmentId}`, appointmentData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });
 
      await fetchAppointments();
      
      if (showToast) {
        showToast('success', 'Success', 'Appointment updated successfully!');
      }
      
      return true;
      
    } catch (error) {
      console.error('Error updating appointment:', error);
      
      if (showToast) {
        if (error.response) {
          if (error.response.status === 401) {
            showToast('error', 'Authentication Failed', 'Please log in again.');
          } else if (error.response.status === 403) {
            showToast('error', 'Access Denied', 'You do not have permission to update appointments.');
          } else if (error.response.status === 404) {
            showToast('error', 'Not Found', 'Appointment not found.');
          } else {
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            showToast('error', 'Server Error', `Failed to update appointment: ${errorMessage}`);
          }
        } else if (error.request) {
          showToast('error', 'Network Error', 'Failed to update appointment. Please check your connection and try again.');
        } else {
          showToast('error', 'Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAppointments, showToast]);

  const deleteAppointment = useCallback(async (appointmentId) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      await axios.delete(`/api/appointments/delete/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      await fetchAppointments();
      
      if (showToast) {
        showToast('success', 'Success', 'Appointment cancelled successfully!');
      }
      
      return true;
      
    } catch (error) {
      console.error('Error deleting appointment:', error);
      
      if (showToast) {
        if (error.response) {
          if (error.response.status === 401) {
            showToast('error', 'Authentication Failed', 'Please log in again.');
          } else if (error.response.status === 403) {
            showToast('error', 'Access Denied', 'You do not have permission to cancel appointments.');
          } else if (error.response.status === 404) {
            showToast('error', 'Not Found', 'Appointment not found.');
          } else {
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            showToast('error', 'Server Error', `Failed to cancel appointment: ${errorMessage}`);
          }
        } else if (error.request) {
          showToast('error', 'Network Error', 'Failed to cancel appointment. Please check your connection and try again.');
        } else {
          showToast('error', 'Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAppointments, showToast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    setAppointments,
    loading,
    submitting,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  };
};

export default useAppointments;