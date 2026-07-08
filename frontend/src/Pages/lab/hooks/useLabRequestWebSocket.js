import { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../../../hooks/useWebSocket';

const useLabRequestWebSocket = (showToast = null) => {
  const [labRequests, setLabRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0
  });

  // Handle new lab request received
  const handleNewLabRequest = useCallback((newRequest) => {
    console.log('🧪 New lab request received:', newRequest);
    
    setLabRequests(prev => {
      // Check if request already exists
      const exists = prev.some(req => req.requestId === newRequest.requestId);
      if (exists) {
        return prev;
      }
      
      // Add new request to the beginning of the list
      return [newRequest, ...prev];
    });

    // Update stats
    setStats(prev => ({
      ...prev,
      pending: prev.pending + 1,
      urgent: newRequest.tests?.some(test => test.urgent) ? prev.urgent + 1 : prev.urgent
    }));

    // Show toast notification if available
    if (showToast) {
      const isUrgent = newRequest.tests?.some(test => test.urgent);
      showToast(
        isUrgent ? 'warning' : 'info',
        'New Lab Request',
        `${isUrgent ? '🚨 URGENT: ' : ''}New lab request from ${newRequest.patientName} (${newRequest.wardName})`
      );
    }
  }, [showToast]);

  // Handle lab request status update
  const handleLabRequestStatusUpdate = useCallback((updatedRequest) => {
    console.log('🔄 Lab request status updated:', updatedRequest);
    
    setLabRequests(prev => {
      return prev.map(req => 
        req.requestId === updatedRequest.requestId ? updatedRequest : req
      );
    });

    // Show toast notification if available
    if (showToast) {
      showToast(
        'success',
        'Status Updated',
        `Lab request ${updatedRequest.requestId} status changed to ${updatedRequest.status}`
      );
    }
  }, [showToast]);

  // Handle urgent lab request notification
  const handleUrgentLabRequest = useCallback((urgentRequest) => {
    console.log('🚨 Urgent lab request received:', urgentRequest);
    
    // Show urgent toast notification
    if (showToast) {
      showToast(
        'error',
        'URGENT Lab Request',
        `🚨 Urgent lab request from ${urgentRequest.patientName} (${urgentRequest.wardName}) - Immediate attention required!`
      );
    }
  }, [showToast]);

  // Handle lab request stats update
  const handleLabRequestStats = useCallback((newStats) => {
    console.log('📊 Lab request stats updated:', newStats);
    setStats(newStats);
  }, []);

  // WebSocket subscriptions
  const subscriptions = {
    '/topic/lab-requests/new': handleNewLabRequest,
    '/topic/lab-requests/status-update': handleLabRequestStatusUpdate,
    '/topic/lab-requests/urgent': handleUrgentLabRequest,
    '/topic/lab-requests/stats': handleLabRequestStats
  };

  // Initialize WebSocket connection
  const { 
    isConnected, 
    error, 
    sendMessage, 
    disconnect 
  } = useWebSocket('/ws', subscriptions, {
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Load initial lab requests when connected
  useEffect(() => {
    if (isConnected) {
      console.log('🔗 Lab WebSocket connected - requesting initial data');
      console.log('📊 WebSocket connection status:', { isConnected });
      // You can add initial data fetch here if needed
    } else {
      console.log('❌ Lab WebSocket disconnected');
    }
  }, [isConnected]);

  // Manual refresh function
  const refreshLabRequests = useCallback((newRequests) => {
    setLabRequests(newRequests);
    
    // Calculate stats from the requests
    const newStats = {
      pending: newRequests.filter(req => req.status === 'PENDING').length,
      inProgress: newRequests.filter(req => req.status === 'IN_PROGRESS').length,
      completed: newRequests.filter(req => req.status === 'COMPLETED').length,
      urgent: newRequests.filter(req => req.tests?.some(test => test.urgent)).length
    };
    setStats(newStats);
  }, []);

  // Add new request manually (for initial load)
  const addLabRequest = useCallback((request) => {
    setLabRequests(prev => {
      const exists = prev.some(req => req.requestId === request.requestId);
      if (!exists) {
        return [request, ...prev];
      }
      return prev;
    });
  }, []);

  // Update request status manually
  const updateLabRequestStatus = useCallback((requestId, newStatus) => {
    setLabRequests(prev => {
      return prev.map(req => 
        req.requestId === requestId ? { ...req, status: newStatus } : req
      );
    });
  }, []);

  return {
    labRequests,
    stats,
    connected: isConnected,
    error,
    sendMessage,
    disconnect,
    refreshLabRequests,
    addLabRequest,
    updateLabRequestStatus
  };
};

export default useLabRequestWebSocket;