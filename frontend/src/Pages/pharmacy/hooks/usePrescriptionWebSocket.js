import { useCallback, useState } from 'react';
import useWebSocket from '../../../hooks/useWebSocket';

/**
 * Custom hook for real-time prescription updates via WebSocket
 */
export const usePrescriptionWebSocket = (onPrescriptionUpdate) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket subscription callbacks
  const subscriptions = {
    // Listen to general prescription updates
    '/topic/prescriptions': useCallback((data) => {
      console.log('📬 Prescription WebSocket notification received:', data);

      // Create notification object
      const notification = {
        id: Date.now() + Math.random(),
        type: data.type,
        action: data.action,
        prescription: data.prescription,
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        priority: data.priority || 'NORMAL',
        read: false
      };

      // Add to notifications list
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('New Prescription', {
          body: data.message,
          icon: '/pharmacy-icon.png',
          tag: data.prescription?.prescriptionId,
          requireInteraction: data.priority === 'HIGH'
        });
      }

      // Play sound for urgent prescriptions
      if (data.priority === 'HIGH') {
        playNotificationSound();
      }

      // Call the update callback if provided
      if (onPrescriptionUpdate) {
        onPrescriptionUpdate(data);
      }
    }, [onPrescriptionUpdate]),

    // Listen to urgent prescriptions (separate topic)
    '/topic/prescriptions/urgent': useCallback((data) => {
      console.log('🚨 URGENT Prescription notification received:', data);

      const notification = {
        id: Date.now() + Math.random(),
        type: 'PRESCRIPTION_URGENT',
        action: data.action,
        prescription: data.prescription,
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        priority: 'HIGH',
        read: false
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

      // Show urgent notification
      if (Notification.permission === 'granted') {
        new Notification('⚠️ URGENT PRESCRIPTION', {
          body: data.message,
          icon: '/pharmacy-icon.png',
          tag: data.prescription?.prescriptionId,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }

      // Play sound
      playNotificationSound(true);

      if (onPrescriptionUpdate) {
        onPrescriptionUpdate(data);
      }
    }, [onPrescriptionUpdate])
  };

  // WebSocket configuration
  const wsOptions = {
    debug: import.meta.env.NODE_ENV === 'development',
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ Connected to Prescription WebSocket');
      // Request browser notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from Prescription WebSocket');
    },
    onError: (error) => {
      console.error('❌ Prescription WebSocket error:', error);
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
      const audio = new Audio(urgent ? '/sounds/urgent-beep.mp3' : '/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    } catch (err) {
      console.warn('Notification sound error:', err);
    }
  };

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  return {
    isConnected,
    error,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    reconnect,
    sendMessage
  };
};

export default usePrescriptionWebSocket;
