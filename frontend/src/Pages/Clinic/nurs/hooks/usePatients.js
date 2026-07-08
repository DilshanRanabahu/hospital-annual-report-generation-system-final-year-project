import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const usePatients = (showToast = null) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const registerPatient = useCallback(async (patientData) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      const response = await axios.post('/api/patients/register', patientData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Check if the backend indicates success
      if (response.data && response.data.isSuccess === false) {
        setLastError(response.data.message || 'Registration failed.');
        return false;
      }

      // Clear any previous errors on successful registration
      setLastError(null);
      await fetchPatients();
      return true;
      
    } catch (error) {
      console.error('Error registering patient:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'An error occurred while registering the patient.';

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const serverData = error.response.data;

        switch (status) {
          case 400:
            errorMessage = serverData?.message || 'Invalid patient data. Please check all fields and try again.';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to register patients.';
            break;
          case 409:
            errorMessage = 'A patient with this National ID already exists.';
            break;
          case 500:
            errorMessage = 'Server error occurred. Please try again later or contact IT support.';
            if (serverData?.message) {
              errorMessage += ` Details: ${serverData.message}`;
            }
            break;
          default:
            errorMessage = serverData?.message || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      }

      setLastError(errorMessage);

      // Show toast notification if available
      if (showToast) {
        const toastTitle = error.response?.status === 500 ? 'Server Error' :
                          error.response?.status === 409 ? 'Duplicate Patient' :
                          error.response?.status === 400 ? 'Validation Error' :
                          'Registration Failed';

        showToast('error', toastTitle, errorMessage);
      }

      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchPatients, showToast]);

  const updatePatient = useCallback(async (nationalId, patientData) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      const response = await axios.put(`/api/patients/${nationalId}`, patientData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Check if the backend indicates success
      if (response.data && response.data.isSuccess === false) {
        // Don't show toast here - let components handle their own error messaging
        return false;
      }

      await fetchPatients();
      return true;
      
    } catch (error) {
      console.error('Error updating patient:', error);
      
      if (showToast) {
        if (error.response) {
          if (error.response.status === 401) {
            showToast('error', 'Authentication Failed', 'Please log in again.');
          } else if (error.response.status === 403) {
            showToast('error', 'Access Denied', 'You do not have permission to update patients.');
          } else {
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            showToast('error', 'Update Failed', errorMessage);
          }
        } else if (error.request) {
          showToast('error', 'Network Error', 'Please check your connection and try again.');
        } else {
          showToast('error', 'Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchPatients, showToast]);

  const deletePatient = useCallback(async (nationalId) => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      const response = await axios.delete(`/api/patients/${nationalId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Check if the backend indicates success
      if (response.data && response.data.isSuccess === false) {
        // Don't show toast here - let components handle their own error messaging
        return false;
      }

      await fetchPatients();
      return true;
      
    } catch (error) {
      console.error('Error deleting patient:', error);
      
      if (showToast) {
        if (error.response) {
          if (error.response.status === 401) {
            showToast('error', 'Authentication Failed', 'Please log in again.');
          } else if (error.response.status === 403) {
            showToast('error', 'Access Denied', 'You do not have permission to delete patients.');
          } else {
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            showToast('error', 'Delete Failed', errorMessage);
          }
        } else if (error.request) {
          showToast('error', 'Network Error', 'Please check your connection and try again.');
        } else {
          showToast('error', 'Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
      }
      return false;
    }
  }, [fetchPatients, showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    submitting,
    lastError,
    fetchPatients,
    registerPatient,
    updatePatient,
    deletePatient
  };
};

export default usePatients;