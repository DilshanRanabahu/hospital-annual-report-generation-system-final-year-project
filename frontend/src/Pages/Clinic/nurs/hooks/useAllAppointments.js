import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useAllAppointments = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.warn('No JWT token found');
        setAllAppointments([]);
        return;
      }

      const response = await axios.get('/api/appointments/getAll', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (Array.isArray(response.data)) {
        setAllAppointments(response.data);
      } else {
        console.warn('Unexpected response structure:', response.data);
        setAllAppointments([]);
      }

    } catch (error) {
      console.error('Error fetching all appointments:', error);
      setAllAppointments([]);

      let errorMessage = 'Failed to load appointment history. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view appointment history.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatientAppointments = useCallback((patientNationalId) => {
    return allAppointments.filter(appointment =>
      appointment.patientNationalId === parseInt(patientNationalId)
    ).sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  }, [allAppointments]);

  const getDoctorAppointments = useCallback((doctorEmployeeId) => {
    return allAppointments.filter(appointment =>
      appointment.doctorEmployeeId === parseInt(doctorEmployeeId)
    ).sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  }, [allAppointments]);

  const getAppointmentsByDateRange = useCallback((startDate, endDate) => {
    return allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return appointmentDate >= start && appointmentDate <= end;
    }).sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  }, [allAppointments]);

  const getAppointmentsByStatus = useCallback((status) => {
    return allAppointments.filter(appointment =>
      appointment.status?.toLowerCase() === status.toLowerCase()
    ).sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  }, [allAppointments]);

  useEffect(() => {
    fetchAllAppointments();
  }, [fetchAllAppointments]);

  return {
    allAppointments,
    loading,
    error,
    fetchAllAppointments,
    getPatientAppointments,
    getDoctorAppointments,
    getAppointmentsByDateRange,
    getAppointmentsByStatus
  };
};

export default useAllAppointments;