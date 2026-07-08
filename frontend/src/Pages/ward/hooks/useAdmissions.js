import { useState, useCallback } from 'react';
import axios from 'axios';

const useAdmissions = (showToast = null) => {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [activeAdmissions, setActiveAdmissions] = useState([]);
  const [allAdmissions, setAllAdmissions] = useState([]);
  const [fetchingAdmissions, setFetchingAdmissions] = useState(false);

  const admitPatient = useCallback(async (admissionData) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/admissions/admit', admissionData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setLastError(null);
      return response.data;
    } catch (error) {
      console.error('Error admitting patient:', error);
      
      let errorMessage = 'Failed to admit patient. ';
      const serverMessage = error.response?.data?.message || error.response?.data;
      let isAlreadyAdmitted = false;
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to admit patients.';
      } else if (error.response?.status === 400) {
        if (typeof serverMessage === 'string' && serverMessage.includes('already admitted')) {
          errorMessage = 'This patient is already admitted to a ward. Please check patient records or discharge the patient before re-admission.';
          isAlreadyAdmitted = true;
        } else {
          errorMessage = serverMessage || 'Invalid admission data. Please check your inputs.';
        }
      } else if (error.response?.status === 409) {
        errorMessage = 'This bed is already occupied or patient is already admitted.';
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
        } else if (isAlreadyAdmitted) {
          showToast('error', 'Patient Already Admitted', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Admission Failed', errorMessage);
        }
      }
      
      setLastError({ message: errorMessage, isAlreadyAdmitted });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchActiveAdmissions = useCallback(async () => {
    try {
      setFetchingAdmissions(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/admissions/active', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setActiveAdmissions(response.data);
      setLastError(null);
      return response.data;
    } catch (error) {
      console.error('Error fetching active admissions:', error);
      
      let errorMessage = 'Failed to fetch active admissions. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view admissions.';
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
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Fetch Failed', errorMessage);
        }
      }
      
      setLastError({ message: errorMessage });
      throw error;
    } finally {
      setFetchingAdmissions(false);
    }
  }, [showToast]);

  const fetchAllAdmissions = useCallback(async () => {
    try {
      setFetchingAdmissions(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/admissions/getAll', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setAllAdmissions(response.data);
      setLastError(null);
      return response.data;
    } catch (error) {
      console.error('Error fetching all admissions:', error);
      
      let errorMessage = 'Failed to fetch admissions. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view admissions.';
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
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Fetch Failed', errorMessage);
        }
      }
      
      setLastError({ message: errorMessage });
      throw error;
    } finally {
      setFetchingAdmissions(false);
    }
  }, [showToast]);

  const dischargePatient = useCallback(async (admissionId) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.put(`/api/admissions/discharge/${admissionId}`, {}, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setLastError(null);
      
      if (showToast) {
        showToast('success', 'Patient Discharged', `Patient has been successfully discharged.`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error discharging patient:', error);
      
      let errorMessage = 'Failed to discharge patient. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to discharge patients.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Patient admission not found or already discharged.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid discharge request. Patient may already be discharged.';
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
        } else if (error.response?.status === 400) {
          showToast('error', 'Invalid Request', errorMessage);
        } else if (error.response?.status === 500) {
          showToast('error', 'Server Error', errorMessage);
        } else {
          showToast('error', 'Discharge Failed', errorMessage);
        }
      }
      
      setLastError({ message: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  return {
    loading,
    lastError,
    admitPatient,
    activeAdmissions,
    allAdmissions,
    fetchingAdmissions,
    fetchActiveAdmissions,
    fetchAllAdmissions,
    dischargePatient
  };
};

export default useAdmissions;