import { useState, useCallback } from 'react';
import axios from 'axios';

const useLabRequests = (showToast = null) => {
  const [labRequests, setLabRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Available lab tests (this could be fetched from backend)
  const availableTests = [
    { id: 'CBC', name: 'Complete Blood Count', category: 'Hematology', urgent: false, description: 'Evaluates overall health and detects blood disorders' },
    { id: 'GLUCOSE', name: 'Blood Glucose', category: 'Chemistry', urgent: true, description: 'Measures blood sugar levels' },
    { id: 'UA', name: 'Urine Analysis', category: 'Chemistry', urgent: false, description: 'Detects urinary tract infections and kidney problems' },
    { id: 'CHOLESTEROL', name: 'Cholesterol Level', category: 'Chemistry', urgent: false, description: 'Measures total cholesterol, HDL, LDL levels in mg/dL' }
  ];

  // Generate unique request ID
  const generateRequestId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `LAB-${timestamp}${random}`;
  };

  // Fetch all lab requests
  const fetchLabRequests = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get('/api/lab-requests/all', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      setLabRequests(response.data);
      setLastError(null);
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      
      let errorMessage = 'Failed to fetch lab requests. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view lab requests.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }
      
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Create lab request
  const createLabRequest = useCallback(async (requestData) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Prepare request payload
      const payload = {
        requestId: generateRequestId(),
        patientNationalId: requestData.patientNationalId,
        patientName: requestData.patientName,
        wardName: requestData.wardName,
        bedNumber: requestData.bedNumber,
        requestedBy: requestData.requestedBy,
        requestDate: new Date().toISOString(),
        tests: requestData.selectedTests.map(test => ({
          id: test.id,
          name: test.name,
          category: test.category,
          urgent: test.urgent
        }))
      };

      const response = await axios.post('/api/lab-requests/create', payload, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      setLastError(null);
      
      if (showToast) {
        showToast('success', 'Lab Request Created', 
          `Lab request ${payload.requestId} created successfully for ${requestData.patientName}`);
      }

      // Refresh lab requests
      fetchLabRequests();
      
      return response.data;
    } catch (error) {
      console.error('Error creating lab request:', error);
      
      let errorMessage = 'Failed to create lab request. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create lab requests.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data || 'Invalid request data. Please check your inputs.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      if (showToast) {
        showToast('error', 'Request Failed', errorMessage);
      }
      
      setLastError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToast, fetchLabRequests]);

  // Fetch lab requests by ward
  const fetchLabRequestsByWard = useCallback(async (wardName) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get(`/api/lab-requests/ward/${encodeURIComponent(wardName)}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      setLabRequests(response.data);
      setLastError(null);
    } catch (error) {
      console.error('Error fetching ward lab requests:', error);
      setLastError('Failed to fetch ward lab requests');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch lab requests by patient
  const fetchLabRequestsByPatient = useCallback(async (patientNationalId) => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        return [];
      }

      const response = await axios.get(`/api/lab-requests/patient/${patientNationalId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching patient lab requests:', error);
      return [];
    }
  }, []);

  // Get pending lab requests
  const fetchPendingLabRequests = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        return;
      }

      const response = await axios.get('/api/lab-requests/pending', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      setLabRequests(response.data);
      setLastError(null);
    } catch (error) {
      console.error('Error fetching pending lab requests:', error);
      setLastError('Failed to fetch pending lab requests');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    labRequests,
    loading,
    lastError,
    availableTests,
    createLabRequest,
    fetchLabRequests,
    fetchLabRequestsByWard,
    fetchLabRequestsByPatient,
    fetchPendingLabRequests,
    generateRequestId
  };
};

export default useLabRequests;