import { useState, useCallback } from 'react';
import axios from 'axios';

const useTransferReports = (showToast = null) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState(null);

  const generateTransferReport = useCallback(async (patientNationalId, patientName, preview = false) => {
    if (!patientNationalId) {
      if (showToast) {
        showToast('error', 'Invalid Patient', 'Patient National ID is required to generate report.');
      }
      return;
    }

    try {
      setIsGenerating(true);
      setLastError(null);
      
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const endpoint = preview 
        ? `/api/reports/transfers/patient/${patientNationalId}/preview`
        : `/api/reports/transfers/patient/${patientNationalId}/pdf`;

      const response = await axios.get(`${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        
        if (preview) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank', 'width=800,height=600');
          
          if (showToast) {
            showToast('success', 'Report Preview', 'Professional PDF report opened in new window.');
          }
        } else {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Transfer_Report_${patientNationalId}_${patientName ? patientName.replace(/\s+/g, '_') : 'Patient'}_${new Date().toISOString().slice(0, 10)}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          if (showToast) {
            showToast('success', 'PDF Downloaded', `Professional transfer report for ${patientName || patientNationalId} has been downloaded.`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating transfer report:', error);
      
      let errorMessage = 'Failed to generate transfer report.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Patient not found or no transfer history available.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to generate transfer reports.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      if (showToast) {
        showToast('error', 'Report Generation Failed', errorMessage);
      }
      
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [showToast]);

  return {
    isGenerating,
    lastError,
    generateTransferReport,
    setLastError
  };
};

export default useTransferReports;