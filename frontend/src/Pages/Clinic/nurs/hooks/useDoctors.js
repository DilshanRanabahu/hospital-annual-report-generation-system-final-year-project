import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getRandomColor = () => {
    const colors = [
      'from-blue-200 to-blue-300',
      'from-green-200 to-green-300',
      'from-purple-200 to-purple-300',
      'from-orange-200 to-orange-300',
      'from-pink-200 to-pink-300',
      'from-indigo-200 to-indigo-300'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRandomBgColor = () => {
    const colors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50', 'bg-pink-50', 'bg-indigo-50'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRandomTextColor = () => {
    const colors = ['text-blue-700', 'text-green-700', 'text-purple-700', 'text-orange-700', 'text-pink-700', 'text-indigo-700'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const transformDoctorData = useCallback((apiDoctor) => ({
    id: apiDoctor.employeeId,
    name: apiDoctor.doctorName,
    empId: apiDoctor.employeeId,
    specialization: apiDoctor.specialization,
    avatar: apiDoctor.doctorName.split(' ').map(n => n[0]).join('').toUpperCase(),
    color: getRandomColor(),
    bgColor: getRandomBgColor(),
    textColor: getRandomTextColor(),
    available: true
  }), []);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        console.warn('No JWT token found');
        setDoctors([]); // Set empty array if no token
        return;
      }

      const response = await axios.get('/api/doctors/getAll', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      // Add proper response validation
      
      // Check if response.data is an array
      if (Array.isArray(response.data)) {
        const transformedDoctors = response.data.map(transformDoctorData);
        setDoctors(transformedDoctors);
      } else if (response.data && Array.isArray(response.data.data)) {
        // Handle case where data is nested
        const transformedDoctors = response.data.data.map(transformDoctorData);
        setDoctors(transformedDoctors);
      } else {
        console.warn('Unexpected API response structure:', response.data);
        setDoctors([]); // Set empty array for unexpected structure
      }
      
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]); // Set empty array on error
      
      let errorMessage = 'Failed to load doctors data. ';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view doctors data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      console.error('Error fetching doctors:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [transformDoctorData]);

  const addDoctor = useCallback(async (doctorData, showToast) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        } else {
          console.error('Authentication required');
        }
        return false;
      }

      const requestData = {
        employeeId: doctorData.empId,
        doctorName: doctorData.name,
        specialization: doctorData.specialization
      };

      await axios.post('/api/doctors/add', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      await fetchDoctors();
      if (showToast) {
        showToast('success', 'Success', 'Doctor added successfully!');
      } else {
        console.log('Doctor added successfully!');
      }
      return true;
      
    } catch (error) {
      console.error('Error adding doctor:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          const message = 'Authentication failed. Please log in again.';
          showToast ? showToast('error', 'Authentication Failed', message) : console.error(message);
        } else if (error.response.status === 403) {
          const message = 'You do not have permission to add doctors.';
          showToast ? showToast('error', 'Access Denied', message) : console.error(message);
        } else if (error.response.status === 409 || error.response.data?.message?.includes('already exists')) {
          const message = 'Please use a different Employee ID. Each doctor must have a unique Employee ID.';
          showToast ? showToast('error', 'Employee ID Exists', message) : console.error('Employee ID already exists:', message);
        } else if (error.response.status === 400) {
          const errorMessage = error.response.data?.message || 'Invalid data provided';
          const message = errorMessage + '\nPlease check your input and try again.';
          showToast ? showToast('warning', 'Invalid Data', message) : console.error('Validation error:', errorMessage);
        } else {
          const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
          const message = `Failed to add doctor: ${errorMessage}`;
          showToast ? showToast('error', 'Server Error', message) : console.error(message);
        }
      } else if (error.request) {
        const message = 'Failed to add doctor. Please check your connection and try again.';
        showToast ? showToast('error', 'Network Error', message) : console.error(message);
      } else {
        const message = 'An unexpected error occurred. Please try again.';
        showToast ? showToast('error', 'Unexpected Error', message) : console.error(message);
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchDoctors]);

  const deleteDoctor = useCallback(async (doctorId, showToast) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        } else {
          console.error('Authentication required');
        }
        return false;
      }

      await axios.delete(`/api/doctors/delete/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      await fetchDoctors();
      if (showToast) {
        showToast('success', 'Success', 'Doctor removed successfully!');
      } else {
        console.log('Doctor removed successfully!');
      }
      return true;
      
    } catch (error) {
      console.error('Error deleting doctor:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          const message = 'Authentication failed. Please log in again.';
          showToast ? showToast('error', 'Authentication Failed', message) : console.error(message);
        } else if (error.response.status === 403) {
          const message = 'You do not have permission to delete doctors.';
          showToast ? showToast('error', 'Access Denied', message) : console.error(message);
        } else if (error.response.status === 404) {
          const message = 'Doctor not found. They may have already been removed.';
          showToast ? showToast('warning', 'Not Found', message) : console.error(message);
        } else if (error.response.status === 409) {
          const message = 'Cannot delete doctor. They may have scheduled appointments.';
          showToast ? showToast('warning', 'Cannot Delete', message) : console.error(message);
        } else {
          const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
          const message = `Failed to delete doctor: ${errorMessage}`;
          showToast ? showToast('error', 'Server Error', message) : console.error(message);
        }
      } else if (error.request) {
        const message = 'Failed to delete doctor. Please check your connection and try again.';
        showToast ? showToast('error', 'Network Error', message) : console.error(message);
      } else {
        const message = 'An unexpected error occurred. Please try again.';
        showToast ? showToast('error', 'Unexpected Error', message) : console.error(message);
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchDoctors]);

  const updateDoctor = useCallback(async (doctorData, showToast) => {
    try {
      setSubmitting(true);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) {
          showToast('error', 'Authentication Required', 'Please log in again.');
        } else {
          console.error('Authentication required');
        }
        return false;
      }

      const requestData = {
        doctorName: doctorData.name,
        specialization: doctorData.specialization
      };

      await axios.put(`/api/doctors/update/${doctorData.id}`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      await fetchDoctors();
      if (showToast) {
        showToast('success', 'Success', 'Doctor updated successfully!');
      } else {
        console.log('Doctor updated successfully!');
      }
      return true;
      
    } catch (error) {
      console.error('Error updating doctor:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          const message = 'Authentication failed. Please log in again.';
          showToast ? showToast('error', 'Authentication Failed', message) : console.error(message);
        } else if (error.response.status === 403) {
          const message = 'You do not have permission to update doctors.';
          showToast ? showToast('error', 'Access Denied', message) : console.error(message);
        } else if (error.response.status === 404) {
          const message = 'Doctor not found. They may have been removed.';
          showToast ? showToast('warning', 'Not Found', message) : console.error(message);
        } else if (error.response.status === 409 || error.response.data?.message?.includes('already exists')) {
          const message = 'Please use a different Employee ID. Each doctor must have a unique Employee ID.';
          showToast ? showToast('error', 'Employee ID Exists', message) : console.error('Employee ID already exists:', message);
        } else if (error.response.status === 400) {
          const errorMessage = error.response.data?.message || 'Invalid data provided';
          const message = errorMessage + '\nPlease check your input and try again.';
          showToast ? showToast('warning', 'Invalid Data', message) : console.error('Validation error:', errorMessage);
        } else {
          const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
          const message = `Failed to update doctor: ${errorMessage}`;
          showToast ? showToast('error', 'Server Error', message) : console.error(message);
        }
      } else if (error.request) {
        const message = 'Failed to update doctor. Please check your connection and try again.';
        showToast ? showToast('error', 'Network Error', message) : console.error(message);
      } else {
        const message = 'An unexpected error occurred. Please try again.';
        showToast ? showToast('error', 'Unexpected Error', message) : console.error(message);
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchDoctors]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    submitting,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    fetchDoctors
  };
};

export default useDoctors;