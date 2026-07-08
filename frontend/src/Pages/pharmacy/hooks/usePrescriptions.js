import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import usePrescriptionWebSocket from './usePrescriptionWebSocket';

export const usePrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      throw new Error('Authentication required. Please log in again.');
    }
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Helper function to determine prescription urgency
  const determinePrescriptionUrgency = useCallback((prescription) => {
    const urgentKeywords = ['emergency', 'urgent', 'stat', 'asap', 'critical'];
    const instructions = prescription.instructions?.toLowerCase() || '';
    const notes = (prescription.prescriptionNotes || prescription.notes)?.toLowerCase() || '';
    
    if (urgentKeywords.some(keyword => 
      instructions.includes(keyword) || notes.includes(keyword)
    )) {
      return 'urgent';
    }
    
    const urgentMedications = (prescription.prescriptionItems || prescription.medications || []).some(med => 
      med.drugName?.toLowerCase().includes('insulin') ||
      med.drugName?.toLowerCase().includes('epinephrine') ||
      med.drugName?.toLowerCase().includes('nitroglycerin') ||
      med.isUrgent === true
    );
    
    return urgentMedications ? 'urgent' : 'normal';
  }, []);

  // Fetch prescriptions from the main API
  const fetchPrescriptionsFromAPI = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      
      // Fetch both ward prescriptions and clinic prescriptions
      const [wardResponse, clinicResponse] = await Promise.all([
        axios.get('/api/prescriptions/all', { headers }),
        axios.get('/api/clinic/prescriptions', { headers })
      ]);
      
      // Handle ward prescriptions
      let wardPrescriptions = [];
      if (wardResponse.data.success && Array.isArray(wardResponse.data.data)) {
        wardPrescriptions = wardResponse.data.data;
      } else if (wardResponse.data.data && Array.isArray(wardResponse.data.data)) {
        wardPrescriptions = wardResponse.data.data;
      } else if (Array.isArray(wardResponse.data)) {
        wardPrescriptions = wardResponse.data;
      }

      // Handle clinic prescriptions  
      let clinicPrescriptions = [];
      if (clinicResponse.data.content && Array.isArray(clinicResponse.data.content)) {
        clinicPrescriptions = clinicResponse.data.content;
      } else if (Array.isArray(clinicResponse.data)) {
        clinicPrescriptions = clinicResponse.data;
      }

      console.log(`📊 Fetched ${wardPrescriptions.length} ward prescriptions and ${clinicPrescriptions.length} clinic prescriptions`);

      // Transform ward prescriptions for pharmacy use
      const transformedWardPrescriptions = wardPrescriptions.map(prescription => ({
        // Core prescription data
        id: prescription.prescriptionId || prescription.id,
        prescriptionId: prescription.prescriptionId,
        patientName: prescription.patientName,
        patientId: prescription.patientId,
        patientNationalId: prescription.patientNationalId,
        doctorName: prescription.doctorName || prescription.prescribedBy,
        admissionId: prescription.admissionId,
        wardName: prescription.wardName,
        bedNumber: prescription.bedNumber,
        
        // Prescription details - map prescriptionItems to medications for compatibility
        medications: prescription.prescriptionItems || prescription.medications || [],
        prescriptionItems: prescription.prescriptionItems || [],
        totalMedications: prescription.totalMedications || prescription.prescriptionItems?.length || prescription.medications?.length || 0,
        status: prescription.status || 'ACTIVE', // Keep original backend status
        prescribedDate: prescription.prescribedDate,
        startDate: prescription.startDate,
        endDate: prescription.endDate,
        instructions: prescription.instructions,
        notes: prescription.prescriptionNotes || prescription.notes,
        prescriptionNotes: prescription.prescriptionNotes,
        
        // Pharmacy-specific fields
        urgency: determinePrescriptionUrgency(prescription),
        needsReview: (prescription.prescriptionItems || prescription.medications || []).some(med => med.isHighRisk) || false,
        interactions: [], // To be populated by drug interaction checks
        
        // Status tracking
        receivedAt: prescription.prescribedDate || prescription.createdAt || new Date().toISOString(),
        processedAt: null,
        dispensedAt: null,
        processedBy: null,
        createdAt: prescription.createdAt,
        lastModified: prescription.lastModified
      }));

      // Transform clinic prescriptions for pharmacy use
      const transformedClinicPrescriptions = clinicPrescriptions.map(prescription => {
        console.log('📋 Transforming clinic prescription:', prescription.prescriptionId, 'Items:', prescription.prescriptionItems?.length || 0);
        
        return {
          // Core prescription data
          id: prescription.prescriptionId || prescription.id,
          prescriptionId: prescription.prescriptionId,
          patientName: prescription.patientName || 
                      (prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Unknown Patient'),
          patientId: prescription.patientNationalId || prescription.patientId ||
                    (prescription.patient ? prescription.patient.nationalId : 'Unknown'),
          patientNationalId: prescription.patientNationalId || 
                            (prescription.patient ? prescription.patient.nationalId : 'Unknown'),
          doctorName: prescription.doctorName || prescription.prescribedBy,
          clinicName: prescription.clinicName,
          visitType: prescription.visitType,
          
          // No admission details for clinic prescriptions
          admissionId: null,
          wardName: null,
          bedNumber: null,
          
          // Prescription details - transform prescriptionItems to extract medication details
          medications: prescription.prescriptionItems?.map(item => ({
            id: item.id,
            drugName: item.drugName,
            genericName: item.genericName,
            dosageForm: item.dosageForm,
            manufacturer: item.manufacturer,
            dose: item.dose,
            frequency: item.frequency,
            quantity: item.quantity,
            quantityUnit: item.quantityUnit,
            instructions: item.instructions,
            route: item.route,
            isUrgent: item.isUrgent || false,
            notes: item.notes
          })) || [],
          prescriptionItems: prescription.prescriptionItems || [],
          totalMedications: prescription.totalMedications || prescription.prescriptionItems?.length || 0,
          status: prescription.status || 'ACTIVE',
          prescribedDate: prescription.prescribedDate,
          startDate: prescription.startDate,
          endDate: prescription.endDate,
          instructions: prescription.instructions,
          notes: prescription.prescriptionNotes || prescription.notes,
          prescriptionNotes: prescription.prescriptionNotes,
          
          // Pharmacy-specific fields
          urgency: determinePrescriptionUrgency(prescription),
          needsReview: (prescription.prescriptionItems || prescription.medications || []).some(med => med.isHighRisk) || false,
          interactions: [],
          
          // Status tracking
          receivedAt: prescription.prescribedDate || prescription.createdAt || new Date().toISOString(),
          processedAt: null,
          dispensedAt: null,
          processedBy: null,
          createdAt: prescription.createdAt,
          lastModified: prescription.lastModified,
          
          // Mark as clinic prescription for UI differentiation
          isClinicPrescription: true
        };
      });

      // Combine both ward and clinic prescriptions
      const allPrescriptions = [...transformedWardPrescriptions, ...transformedClinicPrescriptions];
      
      console.log(`📊 Total prescriptions for pharmacy: ${allPrescriptions.length} (${transformedWardPrescriptions.length} ward + ${transformedClinicPrescriptions.length} clinic)`);

      return allPrescriptions;
    } catch (error) {
      console.error('Failed to fetch prescriptions from API:', error);
      throw error;
    }
  }, [getAuthHeaders, determinePrescriptionUrgency]);

  // Initialize prescriptions
  const initializePrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPrescriptionsFromAPI();
      setPrescriptions(data);
    } catch (err) {
      setError('Failed to load prescriptions');
      console.error('Error loading prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPrescriptionsFromAPI]);

  // Fetch clinic prescription details when notified via WebSocket
  const fetchClinicPrescriptionDetails = useCallback(async (prescriptionId) => {
    try {
      console.log('🔍 Fetching clinic prescription details:', prescriptionId);
      
      const response = await axios.get(`/api/clinic/prescriptions/prescription/${prescriptionId}`, {
        headers: getAuthHeaders()
      });

      const clinicPrescription = response.data;
      console.log('📋 Received clinic prescription data:', {
        prescriptionId: clinicPrescription.prescriptionId,
        itemsCount: clinicPrescription.prescriptionItems?.length || 0,
        hasPatient: !!clinicPrescription.patient,
        hasMedicationDetails: clinicPrescription.prescriptionItems?.[0]?.drugName ? 'YES' : 'NO'
      });
      
      // Transform to pharmacy format - handle both old and new response structures
      const transformedPrescription = {
        id: clinicPrescription.prescriptionId,
        prescriptionId: clinicPrescription.prescriptionId,
        patientName: clinicPrescription.patientName || 
                    (clinicPrescription.patient ? `${clinicPrescription.patient.firstName} ${clinicPrescription.patient.lastName}` : 'Unknown Patient'),
        patientId: clinicPrescription.patientNationalId || clinicPrescription.patientId ||
                  (clinicPrescription.patient ? clinicPrescription.patient.nationalId : 'Unknown'),
        patientNationalId: clinicPrescription.patientNationalId || 
                          (clinicPrescription.patient ? clinicPrescription.patient.nationalId : 'Unknown'),
        doctorName: clinicPrescription.prescribedBy,
        admissionId: null,
        wardName: clinicPrescription.clinicName || 'Outpatient Clinic',
        bedNumber: null,
        
        // Handle both old structure (item.medication.drugName) and new structure (item.drugName)
        medications: clinicPrescription.prescriptionItems?.map(item => ({
          id: item.id,
          medicationId: item.medication?.id || item.medicationId,
          drugName: item.drugName || item.medication?.drugName,
          genericName: item.genericName || item.medication?.genericName,
          dosageForm: item.dosageForm || item.medication?.dosageForm,
          manufacturer: item.manufacturer || item.medication?.manufacturer,
          dose: item.dose,
          frequency: item.frequency,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          instructions: item.instructions,
          route: item.route,
          isUrgent: item.isUrgent || false,
          notes: item.notes,
          currentStock: item.medication?.currentStock,
          unitCost: item.medication?.unitCost
        })) || [],
        prescriptionItems: clinicPrescription.prescriptionItems || [],
        totalMedications: clinicPrescription.totalMedications || clinicPrescription.prescriptionItems?.length || 0,
        status: clinicPrescription.status || 'ACTIVE',
        prescribedDate: clinicPrescription.prescribedDate,
        startDate: clinicPrescription.startDate,
        endDate: clinicPrescription.endDate,
        instructions: '',
        notes: clinicPrescription.prescriptionNotes || '',
        prescriptionNotes: clinicPrescription.prescriptionNotes || '',
        urgency: 'normal',
        needsReview: false,
        interactions: [],
        isClinicPrescription: true
      };

      console.log('🔄 Transformed clinic prescription:', {
        prescriptionId: transformedPrescription.prescriptionId,
        medicationsCount: transformedPrescription.medications.length,
        firstMedication: transformedPrescription.medications[0]?.drugName || 'None'
      });

      // Update the prescription in the list with full details
      setPrescriptions(prevPrescriptions => 
        prevPrescriptions.map(p => 
          p.prescriptionId === prescriptionId ? transformedPrescription : p
        )
      );

      console.log('✅ Updated clinic prescription with full details:', prescriptionId);
      
    } catch (error) {
      console.error('❌ Failed to fetch clinic prescription details:', error);
    }
  }, [getAuthHeaders]);

  // WebSocket handler for real-time prescription updates
  const handlePrescriptionWebSocketUpdate = useCallback((data) => {
    console.log('🔄 Processing WebSocket update:', data);

    if (data.type === 'PRESCRIPTION_CREATED' || data.type === 'PRESCRIPTION_URGENT' || 
        data.type === 'CLINIC_PRESCRIPTION_CREATED') {
      
      // Handle clinic prescription format
      if (data.type === 'CLINIC_PRESCRIPTION_CREATED') {
        console.log('🏥 Processing clinic prescription:', data);
        
        // Transform clinic prescription data to match expected format
        const clinicPrescription = {
          id: data.prescriptionId,
          prescriptionId: data.prescriptionId,
          patientName: data.patientName,
          patientId: data.patientNationalId,
          patientNationalId: data.patientNationalId,
          doctorName: data.prescribedBy,
          admissionId: null, // Clinic prescriptions don't have admissions
          wardName: data.clinicName || 'Outpatient Clinic',
          bedNumber: null, // Clinic patients don't have bed numbers
          medications: [], // Will be populated from API call
          prescriptionItems: [],
          totalMedications: data.totalMedications || 0,
          status: data.status || 'PENDING',
          prescribedDate: data.prescribedDate,
          startDate: null, // Will be fetched from full prescription
          endDate: null,
          instructions: '',
          notes: '',
          prescriptionNotes: '',
          urgency: 'normal', // Clinic prescriptions are typically normal priority
          needsReview: false,
          interactions: [],
          isClinicPrescription: true // Flag to identify clinic prescriptions
        };

        // Add to prescriptions list
        setPrescriptions(prevPrescriptions => {
          const exists = prevPrescriptions.some(p => p.prescriptionId === data.prescriptionId);
          if (!exists) {
            console.log('✅ Added clinic prescription to pharmacy queue:', data.prescriptionId);
            return [clinicPrescription, ...prevPrescriptions];
          }
          return prevPrescriptions;
        });

        // Fetch full prescription details from clinic prescription API
        fetchClinicPrescriptionDetails(data.prescriptionId);
        return;
      }

      // Handle regular ward prescription format
      const transformedPrescription = {
        id: data.prescription.prescriptionId || data.prescription.id,
        prescriptionId: data.prescription.prescriptionId,
        patientName: data.prescription.patientName,
        patientId: data.prescription.patientId,
        patientNationalId: data.prescription.patientNationalId,
        doctorName: data.prescription.doctorName || data.prescription.prescribedBy,
        admissionId: data.prescription.admissionId,
        wardName: data.prescription.wardName,
        bedNumber: data.prescription.bedNumber,
        medications: data.prescription.prescriptionItems || data.prescription.medications || [],
        prescriptionItems: data.prescription.prescriptionItems || [],
        totalMedications: data.prescription.totalMedications,
        status: data.prescription.status || 'ACTIVE',
        prescribedDate: data.prescription.prescribedDate,
        startDate: data.prescription.startDate,
        endDate: data.prescription.endDate,
        instructions: data.prescription.instructions,
        notes: data.prescription.prescriptionNotes || data.prescription.notes,
        prescriptionNotes: data.prescription.prescriptionNotes,
        urgency: data.priority === 'HIGH' ? 'urgent' : determinePrescriptionUrgency(data.prescription),
        needsReview: (data.prescription.prescriptionItems || []).some(med => med.isHighRisk) || false,
        interactions: [],
        receivedAt: data.prescription.prescribedDate || new Date().toISOString(),
        processedAt: null,
        dispensedAt: null,
        processedBy: null,
        createdAt: data.prescription.createdAt,
        lastModified: data.prescription.lastModified
      };

      // Add to prescription list (prepend to show newest first)
      setPrescriptions(prev => {
        // Check if prescription already exists
        const exists = prev.some(p => p.prescriptionId === transformedPrescription.prescriptionId);
        if (exists) {
          return prev; // Don't add duplicates
        }
        return [transformedPrescription, ...prev];
      });

      console.log('✅ New prescription added to pharmacy list:', transformedPrescription.prescriptionId);
    } else if (data.type === 'PRESCRIPTION_UPDATED') {
      // Update existing prescription
      setPrescriptions(prev => prev.map(p =>
        p.prescriptionId === data.prescription.prescriptionId
          ? { ...p, ...data.prescription }
          : p
      ));
      console.log('✅ Prescription updated:', data.prescription.prescriptionId);
    } else if (data.type === 'PRESCRIPTION_CANCELLED') {
      // Update status to cancelled
      setPrescriptions(prev => prev.map(p =>
        p.prescriptionId === data.prescriptionId
          ? { ...p, status: 'cancelled' }
          : p
      ));
      console.log('✅ Prescription cancelled:', data.prescriptionId);
    }
  }, [determinePrescriptionUrgency, fetchClinicPrescriptionDetails]);

  // Initialize WebSocket for real-time updates
  const webSocket = usePrescriptionWebSocket(handlePrescriptionWebSocketUpdate);

  useEffect(() => {
    initializePrescriptions();
  }, [initializePrescriptions]);

  // Process prescription (update status)
  const processPrescription = useCallback(async (prescriptionId) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(`/api/prescriptions/prescription-id/${prescriptionId}/process`, {}, { headers });
      
      setPrescriptions(prev => prev.map(p => 
        p.prescriptionId === prescriptionId 
          ? { ...p, status: 'processing', processedAt: new Date().toISOString() }
          : p
      ));
      return { success: true };
    } catch (err) {
      setError('Failed to process prescription');
      throw err;
    }
  }, [getAuthHeaders]);

  // Update prescription status (works for both ward and clinic prescriptions)
  const updateStatus = useCallback(async (prescriptionId, newStatus) => {
    try {
      const headers = getAuthHeaders();
      
      // Find the prescription to determine if it's clinic or ward prescription
      const prescription = prescriptions.find(p => p.prescriptionId === prescriptionId);
      const isClinicPrescription = prescription?.isClinicPrescription || false;
      
      // Use appropriate API endpoint based on prescription type
      if (isClinicPrescription) {
        // For clinic prescriptions, use the status update endpoint
        const clinicPrescription = await axios.get(`/api/clinic/prescriptions/prescription/${prescriptionId}`, { headers });
        await axios.put(`/api/clinic/prescriptions/${clinicPrescription.data.id}/status`, 
          { status: newStatus }, { headers });
      } else {
        // For ward prescriptions, use existing process endpoint or create status endpoint
        await axios.put(`/api/prescriptions/prescription-id/${prescriptionId}/status`, 
          { status: newStatus }, { headers });
      }
      
      // Update local state
      setPrescriptions(prev => prev.map(p => 
        p.prescriptionId === prescriptionId 
          ? { ...p, status: newStatus, lastModified: new Date().toISOString() }
          : p
      ));
      return { success: true };
    } catch (err) {
      setError('Failed to update prescription status');
      throw err;
    }
  }, [getAuthHeaders, prescriptions]);

  // Dispense medication (complete the prescription)
  const dispenseMedication = useCallback(async (prescriptionId, dispensingData = {}) => {
    try {
      const headers = getAuthHeaders();
      
      // Find the prescription to determine if it's clinic or ward prescription
      const prescription = prescriptions.find(p => p.prescriptionId === prescriptionId);
      const isClinicPrescription = prescription?.isClinicPrescription || false;
      
      // Use appropriate API endpoint based on prescription type
      const endpoint = isClinicPrescription 
        ? `/api/clinic/prescriptions/prescription/${prescriptionId}/dispense`
        : `/api/prescriptions/prescription-id/${prescriptionId}/dispense`;
      
      await axios.post(endpoint, dispensingData, { headers });
      
      setPrescriptions(prev => prev.map(p => 
        p.prescriptionId === prescriptionId 
          ? { 
              ...p, 
              status: 'dispensed',
              dispensedAt: new Date().toISOString(),
              processedBy: dispensingData.pharmacistName || 'Pharmacist'
            }
          : p
      ));
      return { success: true };
    } catch (err) {
      setError('Failed to dispense medication');
      throw err;
    }
  }, [getAuthHeaders, prescriptions]);

  // Cancel prescription
  const cancelPrescription = useCallback(async (prescriptionId, cancellationReason = '') => {
    try {
      const headers = getAuthHeaders();
      
      // Find the prescription to determine if it's clinic or ward prescription
      const prescription = prescriptions.find(p => p.prescriptionId === prescriptionId);
      const isClinicPrescription = prescription?.isClinicPrescription || false;
      
      // Use appropriate API endpoint based on prescription type
      const endpoint = isClinicPrescription 
        ? `/api/clinic/prescriptions/prescription/${prescriptionId}/cancel`
        : `/api/prescriptions/prescription-id/${prescriptionId}/cancel`;
      
      await axios.put(endpoint, { reason: cancellationReason }, { headers });
      
      setPrescriptions(prev => prev.map(p => 
        p.prescriptionId === prescriptionId 
          ? { ...p, status: 'cancelled', cancelledAt: new Date().toISOString() }
          : p
      ));
      return { success: true };
    } catch (err) {
      setError('Failed to cancel prescription');
      throw err;
    }
  }, [getAuthHeaders, prescriptions]);

  // Check drug interactions
  const verifyInteractions = useCallback(async (prescriptionId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`/api/prescriptions/prescription-id/${prescriptionId}/check-interactions`, {}, { headers });
      
      // Handle different response structures
      let interactions = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        interactions = response.data.data;
      } else if (Array.isArray(response.data)) {
        interactions = response.data;
      }
      
      return interactions;
    } catch (err) {
      setError('Failed to verify drug interactions');
      throw err;
    }
  }, [getAuthHeaders]);

  // Get prescriptions by status
  const getPrescriptionsByStatus = useCallback((status) => {
    return prescriptions.filter(p => p.status === status);
  }, [prescriptions]);

  // Get prescriptions statistics
  const getStats = useCallback(() => {
    const total = prescriptions.length;
    const received = prescriptions.filter(p => p.status === 'received').length;
    const processing = prescriptions.filter(p => p.status === 'processing').length;
    const ready = prescriptions.filter(p => p.status === 'ready').length;
    const dispensed = prescriptions.filter(p => p.status === 'dispensed').length;
    
    const today = new Date().toDateString();
    const dispensedToday = prescriptions.filter(p => 
      p.status === 'dispensed' && 
      p.dispensedAt && 
      new Date(p.dispensedAt).toDateString() === today
    ).length;
    
    return {
      totalPrescriptions: total,
      receivedPrescriptions: received,
      processingPrescriptions: processing,
      readyPrescriptions: ready,
      dispensedPrescriptions: dispensed,
      dispensedToday,
      processingRate: total > 0 ? Math.round(((ready + dispensed) / total) * 100) : 0
    };
  }, [prescriptions]);

  // Refresh prescriptions
  const refreshPrescriptions = useCallback(() => {
    initializePrescriptions();
  }, [initializePrescriptions]);

  return {
    prescriptions,
    loading,
    error,
    processPrescription,
    updateStatus,
    dispenseMedication,
    cancelPrescription,
    verifyInteractions,
    getPrescriptionsByStatus,
    getStats,
    refreshPrescriptions,
    // WebSocket properties
    wsConnected: webSocket.isConnected,
    wsError: webSocket.error,
    wsNotifications: webSocket.notifications,
    wsUnreadCount: webSocket.unreadCount,
    markNotificationAsRead: webSocket.markAsRead,
    markAllNotificationsAsRead: webSocket.markAllAsRead,
    clearNotifications: webSocket.clearNotifications
  };
};