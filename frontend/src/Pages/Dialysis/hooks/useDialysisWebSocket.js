import { useCallback, useState, useEffect } from 'react';
import useWebSocket from '../../../hooks/useWebSocket';

/**
 * Custom hook for real-time dialysis updates via WebSocket
 */
export const useDialysisWebSocket = (onDialysisUpdate) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [transferredPatients, setTransferredPatients] = useState([]);

  // WebSocket subscription callbacks
  const subscriptions = {
    // Listen to dialysis-specific transfers
    '/topic/dialysis/transfers': useCallback((data) => {
      console.log('🚑 Dialysis Transfer WebSocket notification received:', data);

      // Create notification object
      const notification = {
        id: Date.now() + Math.random(),
        type: data.type,
        action: data.action,
        transfer: data.transfer,
        newAdmission: data.newAdmission,
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        priority: 'HIGH', // Transfer notifications are high priority
        read: false
      };

      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Add to transferred patients list
      if (data.newAdmission) {
        setTransferredPatients(prev => {
          const existing = prev.find(p => p.admissionId === data.newAdmission.admissionId);
          if (!existing) {
            return [data.newAdmission, ...prev];
          }
          return prev;
        });
      }

      // Play notification sound
      playNotificationSound(true); // Always urgent for transfers

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('New Dialysis Patient Transfer', {
          body: data.message,
          icon: '/dialysis-icon.png',
          tag: 'dialysis-transfer'
        });
      }

      // Call parent callback if provided
      if (onDialysisUpdate) {
        onDialysisUpdate(data);
      }
    }, [onDialysisUpdate]),

    // Listen to general dialysis updates
    '/topic/dialysis': useCallback((data) => {
      console.log('🔄 Dialysis WebSocket notification received:', data);

      // Handle different types of dialysis updates
      if (data.type === 'DIALYSIS_UPDATE') {
        // Handle real-time dialysis updates
        if (onDialysisUpdate) {
          onDialysisUpdate(data);
        }
      } else if (data.type === 'PATIENT_TRANSFERRED_TO_DIALYSIS') {
        // This is handled by the specific transfer topic above
        return;
      }

      // Create notification for non-transfer updates
      const notification = {
        id: Date.now() + Math.random(),
        type: data.type,
        action: data.action,
        data: data.data,
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        priority: data.priority || 'NORMAL',
        read: false
      };

      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
    }, [onDialysisUpdate]),

    // Listen to admissions for Ward 4 (Dialysis ward)
    '/topic/admissions/ward/4': useCallback((data) => {
      console.log('🏥 Ward 4 (Dialysis) Admission WebSocket notification received:', data);

      if (data.type === 'PATIENT_TRANSFERRED_TO_DIALYSIS' && data.newAdmission) {
        // Add to transferred patients if not already present
        setTransferredPatients(prev => {
          const existing = prev.find(p => p.admissionId === data.newAdmission.admissionId);
          if (!existing) {
            return [data.newAdmission, ...prev];
          }
          return prev;
        });

        // Trigger update callback
        if (onDialysisUpdate) {
          onDialysisUpdate(data);
        }
      }
    }, [onDialysisUpdate]),

    // Listen to machine availability updates
    '/topic/dialysis/machines': useCallback((data) => {
      console.log('🤖 Machine Availability WebSocket update received:', data);
      
      // Trigger update callback with machine data
      if (onDialysisUpdate) {
        onDialysisUpdate({
          type: 'MACHINE_AVAILABILITY_UPDATE',
          machines: data,
          timestamp: Date.now()
        });
      }
    }, [onDialysisUpdate])
  };

  // WebSocket configuration
  const wsOptions = {
    debug: import.meta.env.DEV,
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ Connected to Dialysis WebSocket');
      // Request browser notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from Dialysis WebSocket');
    },
    onError: (error) => {
      console.error('❌ Dialysis WebSocket error:', error);
    }
  };

  // Use WebSocket hook
  const { isConnected, error, sendMessage, reconnect } = useWebSocket(
    '/ws',
    subscriptions,
    wsOptions
  );

  // Play notification sound
  const playNotificationSound = (urgent = false) => {
    try {
      const audio = new Audio(urgent ? '/sounds/urgent-alert.mp3' : '/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    } catch (error) {
      console.log('Notification sound not available:', error);
    }
  };

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Request real-time update
  const requestDialysisUpdate = useCallback(() => {
    return sendMessage('/app/dialysis/refresh', {
      timestamp: Date.now(),
      requestedBy: 'dialysis-dashboard'
    });
  }, [sendMessage]);

  // Subscribe to specific patient updates
  const subscribeToPatientUpdates = useCallback((patientId) => {
    return sendMessage('/app/dialysis/subscribe-patient', {
      patientId: patientId,
      timestamp: Date.now()
    });
  }, [sendMessage]);

  // Get transferred patients count
  const getTransferredPatientsCount = useCallback(() => {
    return transferredPatients.length;
  }, [transferredPatients]);

  // Get latest transfers
  const getLatestTransfers = useCallback((limit = 5) => {
    return notifications
      .filter(n => n.type === 'PATIENT_TRANSFERRED_TO_DIALYSIS')
      .slice(0, limit);
  }, [notifications]);

  // Initialize connection on mount
  useEffect(() => {
    // Auto-connect is handled by useWebSocket
    console.log('🔄 Initializing Dialysis WebSocket connection...');

    return () => {
      console.log('🔌 Cleaning up Dialysis WebSocket connection...');
    };
  }, []);

  return {
    // Connection status
    isConnected,
    error,

    // Notifications
    notifications,
    unreadCount,
    transferredPatients,

    // Actions
    markAsRead,
    markAllAsRead,
    clearNotifications,
    requestDialysisUpdate,
    subscribeToPatientUpdates,

    // Data
    getTransferredPatientsCount,
    getLatestTransfers,

    // WebSocket controls
    reconnect
  };
};

export default useDialysisWebSocket;