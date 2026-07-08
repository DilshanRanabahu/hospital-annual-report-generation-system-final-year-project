import { useState,useCallback } from 'react';
import axios from 'axios';

const usePatients = (showToast = null) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPatient, setFetchingPatient] = useState(false);
  const [lastError, setLastError] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get('/api/patients/all', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      
      let errorMessage = 'Failed to load patient data. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view patient data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Loading Failed', errorMessage);
        }
      } else {
        console.error(errorMessage);
      }
      
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Search and filter patients
  const searchPatients = useCallback((searchTerm) => {
    if (!searchTerm) {
      return patients;
    }
    
    const term = searchTerm.toLowerCase();
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(term) ||
      patient.nationalId.toString().includes(term) ||
      patient.contactNumber.includes(term)
    );
  }, [patients]);

  // Get patient details by national ID
  const getPatientByNationalId = useCallback(async (nationalId) => {
    try {
      setFetchingPatient(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get(`/api/patients/${nationalId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setSelectedPatient(response.data);
      setLastError(null);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient details:', error);
      
      let errorMessage = 'Failed to fetch patient details. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view patient details.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Patient not found with the provided National ID.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (showToast) {
        if (error.response?.status === 401) {
          showToast('error', 'Session Expired', errorMessage);
        } else if (error.response?.status === 403) {
          showToast('error', 'Access Denied', errorMessage);
        } else if (error.response?.status === 404) {
          showToast('error', 'Patient Not Found', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Fetch Failed', errorMessage);
        }
      }
      
      setLastError(errorMessage);
      throw error;
    } finally {
      setFetchingPatient(false);
    }
  }, [showToast]);

  // Calculate age from date of birth
  const calculateAge = useCallback((dateOfBirth) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, []);

  return {
    patients,
    selectedPatient,
    loading,
    fetchingPatient,
    lastError,
    fetchPatients,
    getPatientByNationalId,
    searchPatients,
    calculateAge,
    setSelectedPatient
  };
};

export default usePatients;