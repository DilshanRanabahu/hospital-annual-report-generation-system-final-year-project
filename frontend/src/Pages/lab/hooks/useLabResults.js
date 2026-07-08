import { useState, useCallback, useEffect, useMemo } from 'react';

const useLabResults = (showToast = null) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Mock data for demonstration
  const mockResults = useMemo(() => [
    {
      resultId: 'RES-001',
      testOrderId: 'LAB-001',
      patientId: 'PAT-12345',
      patientName: 'John Doe',
      testName: 'Hemoglobin',
      value: '12.5',
      unit: 'g/dL',
      referenceRange: '13.5-17.5',
      status: 'pending_approval',
      isCritical: true,
      testDate: new Date().toISOString(),
      technician: 'Tech A',
      notes: 'Below normal range - requires physician review'
    },
    {
      resultId: 'RES-002',
      testOrderId: 'LAB-002',
      patientId: 'PAT-67890',
      patientName: 'Jane Smith',
      testName: 'Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70-100',
      status: 'approved',
      isCritical: false,
      testDate: new Date(Date.now() - 1800000).toISOString(),
      technician: 'Tech B',
      approvedBy: 'Dr. Smith',
      notes: 'Normal range'
    },
    {
      resultId: 'RES-003',
      testOrderId: 'LAB-003',
      patientId: 'PAT-11111',
      patientName: 'Bob Wilson',
      testName: 'Creatinine',
      value: '2.8',
      unit: 'mg/dL',
      referenceRange: '0.6-1.2',
      status: 'pending_approval',
      isCritical: true,
      testDate: new Date(Date.now() - 3600000).toISOString(),
      technician: 'Tech C',
      notes: 'Significantly elevated - urgent physician notification required'
    }
  ], []);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        console.warn('No JWT token found');
        setResults(mockResults);
        return;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.get('/api/lab/results', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      setResults(response.data);
      */

      // Using mock data for now
      setResults(mockResults);

    } catch (error) {
      console.error('Error fetching results:', error);

      let errorMessage = 'Failed to load test results. ';

      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view test results.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      if (showToast) {
        showToast('error', 'Loading Failed', errorMessage);
      }

      setLastError(errorMessage);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, [showToast, mockResults]);

  const createResult = useCallback(async (resultData) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.post('/api/lab/results', resultData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        setLastError(response.data.message || 'Failed to create result.');
        return false;
      }
      */

      // Mock creation for now
      const newResult = {
        ...resultData,
        resultId: `RES-${Date.now()}`,
        testDate: new Date().toISOString(),
        status: 'pending_approval'
      };

      setResults(prev => [newResult, ...prev]);

      if (showToast) {
        showToast('success', 'Result Created', 'Test result created successfully.');
      }

      setLastError(null);
      return true;

    } catch (error) {
      console.error('Error creating result:', error);

      if (error.response && error.response.data && error.response.data.message) {
        setLastError(error.response.data.message);
      } else {
        setLastError('An error occurred while creating the result.');
      }

      if (showToast) {
        showToast('error', 'Creation Failed', 'Failed to create result.');
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const validateResult = useCallback(async (resultId, validationData = {}) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.patch(`/api/lab/results/${resultId}/validate`, validationData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        return false;
      }
      */

      // Mock validation for now
      setResults(prev =>
        prev.map(result =>
          result.resultId === resultId
            ? { ...result, status: 'validated', ...validationData }
            : result
        )
      );

      if (showToast) {
        showToast('success', 'Result Validated', 'Test result validated successfully.');
      }

      return true;

    } catch (error) {
      console.error('Error validating result:', error);

      if (showToast) {
        showToast('error', 'Validation Failed', 'Failed to validate result.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const approveResult = useCallback(async (resultId, approvalData = {}) => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');

      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        }
        return false;
      }

      // Uncomment when backend is ready
      /*
      const response = await axios.patch(`/api/lab/results/${resultId}/approve`, approvalData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.data && response.data.isSuccess === false) {
        return false;
      }
      */

      // Mock approval for now
      setResults(prev =>
        prev.map(result =>
          result.resultId === resultId
            ? {
                ...result,
                status: 'approved',
                approvedBy: 'Current User',
                approvalDate: new Date().toISOString(),
                ...approvalData
              }
            : result
        )
      );

      if (showToast) {
        showToast('success', 'Result Approved', 'Test result approved and sent to physician.');
      }

      return true;

    } catch (error) {
      console.error('Error approving result:', error);

      if (showToast) {
        showToast('error', 'Approval Failed', 'Failed to approve result.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const getResultsByStatus = useCallback((status) => {
    return results.filter(result => result.status === status);
  }, [results]);

  const getCriticalResults = useCallback(() => {
    return results.filter(result => result.isCritical);
  }, [results]);

  const getStats = useCallback(() => {
    const totalResults = results.length;
    const pendingApproval = results.filter(r => r.status === 'pending_approval').length;
    const approvedResults = results.filter(r => r.status === 'approved').length;
    const criticalResults = results.filter(r => r.isCritical).length;

    const today = new Date().toDateString();
    const todayResults = results.filter(r =>
      r.testDate && new Date(r.testDate).toDateString() === today
    ).length;

    return {
      totalResults,
      pendingApproval,
      approvedResults,
      criticalResults,
      todayResults
    };
  }, [results]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    results,
    loading,
    lastError,
    fetchResults,
    createResult,
    validateResult,
    approveResult,
    getResultsByStatus,
    getCriticalResults,
    getStats
  };
};

export default useLabResults;