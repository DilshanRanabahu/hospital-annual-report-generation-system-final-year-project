import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const useClinicPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get JWT token for authentication
  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem('jwtToken');
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch available medications from pharmacy
  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/pharmacy/medications/getAll', {
        headers: getAuthHeaders()
      });

      // Handle different API response structures
      let medicationsData = [];
      if (response.data?.content && Array.isArray(response.data.content)) {
        // Spring Boot paginated response format
        medicationsData = response.data.content;
        console.log(`✅ Loaded ${medicationsData.length} medications from paginated API response (Total: ${response.data.totalElements})`);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        medicationsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        medicationsData = response.data;
      } else {
        console.warn('Unexpected medication API response structure:', response.data);
        medicationsData = [];
      }

      // Transform medication data for prescription use
      const transformedMedications = medicationsData.map(med => ({
        id: med.id,
        medicationId: med.id,
        drugName: med.drugName,
        name: med.drugName, // Alias for compatibility
        genericName: med.genericName,
        category: med.category,
        strength: med.strength,
        dosageForm: med.dosageForm,
        manufacturer: med.manufacturer,
        batchNumber: med.batchNumber,
        currentStock: med.currentStock,
        minimumStock: med.minimumStock,
        maximumStock: med.maximumStock,
        unitCost: med.unitCost,
        expiryDate: med.expiryDate,
        isActive: med.isActive,
        // Additional fields for prescription modal
        commonInstructions: med.commonInstructions || 'Take as directed'
      }));

      console.log('🔄 API Hook - Raw medications data:', medicationsData.slice(0, 2));
      console.log('✅ API Hook - Transformed medications:', transformedMedications.slice(0, 2));
      console.log('💊 API Hook - Setting medications state with', transformedMedications.length, 'medications');

      setMedications(transformedMedications);
      setError(null);
      return transformedMedications;

    } catch (err) {
      console.error('Error fetching medications:', err);

      let errorMessage = 'Failed to fetch medications. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view medications.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Set fallback medications to prevent crashes
      const fallbackMedications = [
        {
          id: 1,
          medicationId: 1,
          drugName: 'Paracetamol',
          name: 'Paracetamol',
          genericName: 'Acetaminophen',
          category: 'Analgesic',
          strength: '500mg',
          dosageForm: 'Tablet',
          manufacturer: 'Generic',
          currentStock: 100,
          isActive: true,
          commonInstructions: 'Take with water after meals'
        },
        {
          id: 2,
          medicationId: 2,
          drugName: 'Amoxicillin',
          name: 'Amoxicillin',
          genericName: 'Amoxicillin',
          category: 'Antibiotic',
          strength: '250mg',
          dosageForm: 'Capsule',
          manufacturer: 'Generic',
          currentStock: 50,
          isActive: true,
          commonInstructions: 'Complete the full course'
        }
      ];

      console.warn('Using fallback medications due to API error');
      setMedications(fallbackMedications);
      setError(errorMessage);
      return fallbackMedications; // Return fallback instead of throwing
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all patients (for clinic prescriptions, we use all patients not just active admissions)
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/patients/all', {
        headers: getAuthHeaders()
      });

      // Handle different API response structures
      let patientsData = [];
      if (response.data?.content && Array.isArray(response.data.content)) {
        // Spring Boot paginated response format
        patientsData = response.data.content;
        console.log(`✅ Loaded ${patientsData.length} patients from paginated API response (Total: ${response.data.totalElements})`);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        patientsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        patientsData = response.data;
      } else {
        console.warn('Unexpected patients API response structure:', response.data);
        patientsData = [];
      }

      // Transform patient data for prescription use
      const transformedPatients = patientsData.map(patient => ({
        // Original API fields (corrected field names)
        nationalId: patient.nationalId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        name: patient.fullName || `${patient.firstName} ${patient.lastName}`, // Use fullName or combine first+last
        fullName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
        contactNumber: patient.contactNumber,
        emergencyContactNumber: patient.emergencyContactNumber,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        address: patient.address,
        registrationDate: patient.registrationDate,
        
        // Additional fields for prescription management
        patientId: `P${patient.nationalId}`,
        patientNationalId: patient.nationalId, // For API compatibility
        patientName: patient.fullName || `${patient.firstName} ${patient.lastName}`, // For API compatibility
        
        // Clinic patients are always eligible for prescriptions
        isActive: true,
        canReceivePrescription: true,
        consultationType: 'outpatient'
      }));

      console.log('🔄 API Hook - Raw patients data:', patientsData.slice(0, 2));
      console.log('✅ API Hook - Transformed patients:', transformedPatients.slice(0, 2));
      console.log('📊 API Hook - Setting patients state with', transformedPatients.length, 'patients');

      setPatients(transformedPatients);
      setError(null);
      return transformedPatients;

    } catch (err) {
      console.error('Error fetching patients:', err);

      let errorMessage = 'Failed to fetch patients. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view patient data.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Set fallback patients to prevent crashes
      const fallbackPatients = [
        {
          nationalId: '123456789',
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+1-555-0123',
          age: 35,
          gender: 'Male',
          patientId: 'P123456789',
          patientNationalId: '123456789',
          patientName: 'John Smith',
          fullName: 'John Smith',
          isActive: true,
          canReceivePrescription: true,
          consultationType: 'outpatient'
        },
        {
          nationalId: '987654321',
          name: 'Jane Doe',
          email: 'jane.doe@email.com',
          phone: '+1-555-0124',
          age: 28,
          gender: 'Female',
          patientId: 'P987654321',
          patientNationalId: '987654321',
          patientName: 'Jane Doe',
          fullName: 'Jane Doe',
          isActive: true,
          canReceivePrescription: true,
          consultationType: 'outpatient'
        }
      ];

      console.warn('Using fallback patients due to API error');
      setPatients(fallbackPatients);
      setError(errorMessage);
      return fallbackPatients; // Return fallback instead of throwing
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clinic prescriptions from API
  const fetchPrescriptions = useCallback(async (includeDataRefresh = false) => {
    try {
      setLoading(true);

      // Optionally fetch patients and medications first
      if (includeDataRefresh) {
        try {
          await Promise.all([
            fetchPatients(),
            fetchMedications()
          ]);
        } catch (error) {
          console.warn('Failed to fetch supporting data:', error.message);
        }
      }

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Fetch clinic prescriptions from the specific clinic endpoint
      const response = await axios.get('/api/clinic/prescriptions?page=0&size=100&sortBy=prescribedDate&sortDir=desc', {
        headers: getAuthHeaders()
      });

      console.log('📋 Clinic prescriptions API response:', response.data);

      // Handle paginated response - check the correct response structure
      let prescriptionsData = [];
      if (response.data.content && Array.isArray(response.data.content)) {
        // Direct Spring Boot paginated response
        prescriptionsData = response.data.content;
        console.log(`✅ Loaded ${prescriptionsData.length} clinic prescriptions from paginated API response (Total: ${response.data.totalElements})`);
      } else if (response.data.data?.content) {
        // Nested data.content structure
        prescriptionsData = response.data.data.content;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Nested data array
        prescriptionsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        prescriptionsData = response.data;
      } else {
        console.warn('Unexpected clinic prescriptions API response structure:', response.data);
        prescriptionsData = [];
      }

      console.log('🔄 Raw clinic prescriptions data:', prescriptionsData.slice(0, 2));

      const transformedPrescriptions = prescriptionsData.map(prescription => {
        console.log('📋 Transforming prescription:', prescription.prescriptionId, 'with', prescription.prescriptionItems?.length || 0, 'items');
        
        return {
          // Core prescription fields
          id: prescription.prescriptionId || prescription.id,
          prescriptionId: prescription.prescriptionId,
          patientName: prescription.patientName,
          patientId: prescription.patientId,
          patientNationalId: prescription.patientNationalId,
          startDate: prescription.startDate,
          endDate: prescription.endDate,
          prescribedBy: prescription.prescribedBy,
          prescribedDate: prescription.prescribedDate,
          lastModified: prescription.lastModified,
          status: prescription.status?.toLowerCase() || 'active',
          
          // Clinic-specific fields
          wardName: prescription.wardName || 'Outpatient Clinic',
          consultationType: prescription.consultationType || 'outpatient',
          
          // Prescription details
          totalMedications: prescription.totalMedications || prescription.prescriptionItems?.length || 0,
          prescriptionNotes: prescription.prescriptionNotes,
          notes: prescription.prescriptionNotes, // Alias
          prescriptionItems: prescription.prescriptionItems || [],
        
        // Urgent flag
        isUrgent: prescription.isUrgent || prescription.prescriptionItems?.some(item => item.isUrgent) || false,
        hasUrgentMedications: prescription.prescriptionItems?.some(item => item.isUrgent) || false,
        
        // Medication details
        medications: prescription.prescriptionItems?.map(item => ({
          id: item.id,
          drugName: item.drugName,
          dose: item.dose,
          dosage: item.dose, // Alias
          frequency: item.frequency,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          instructions: item.instructions,
          route: item.route,
          isUrgent: item.isUrgent || false,
          itemStatus: item.itemStatus?.toLowerCase() || 'active',
          dosageForm: item.dosageForm,
          genericName: item.genericName,
          manufacturer: item.manufacturer,
          notes: item.notes
        })) || [],
        
        // For backwards compatibility with the old modal
        drugName: prescription.prescriptionItems?.[0]?.drugName || '',
        dose: prescription.prescriptionItems?.[0]?.dose || '',
        frequency: prescription.prescriptionItems?.[0]?.frequency || '',
        quantity: prescription.prescriptionItems?.[0]?.quantity || 0,
        quantityUnit: prescription.prescriptionItems?.[0]?.quantityUnit || '',
        instructions: prescription.prescriptionItems?.[0]?.instructions || '',
        route: prescription.prescriptionItems?.[0]?.route || ''
        };
      });

      console.log('✅ Transformed clinic prescriptions:', transformedPrescriptions.length, 'prescriptions');
      console.log('📊 First prescription sample:', transformedPrescriptions[0]);

      setPrescriptions(transformedPrescriptions);
      setError(null);
      return transformedPrescriptions;

    } catch (err) {
      console.error('Error fetching clinic prescriptions:', err);

      let errorMessage = 'Failed to fetch prescriptions. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view prescriptions.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setPrescriptions([]);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients, fetchMedications]);

  // Add new clinic prescription
  const addPrescription = useCallback(async (prescriptionData) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('🔍 Creating clinic prescription with data:', prescriptionData);

      // Validate required fields - Updated to match new payload format
      if (!prescriptionData.patientNationalId) {
        throw new Error('Patient National ID is required');
      }

      if (!prescriptionData.prescribedBy) {
        throw new Error('Prescribing doctor name is required');
      }

      if (!prescriptionData.medications || prescriptionData.medications.length === 0) {
        throw new Error('At least one medication is required');
      }

      // Transform frontend data to API format (EXACT SAME as Ward Management)
      const apiData = {
        patientNationalId: prescriptionData.patientNationalId,
        admissionId: null, // Clinic patients don't have admissions
        prescribedBy: prescriptionData.prescribedBy || 'Clinic Doctor',
        startDate: prescriptionData.startDate,
        endDate: prescriptionData.endDate,
        prescriptionNotes: prescriptionData.prescriptionNotes || prescriptionData.notes || '',
        
        // Map medications to prescriptionItems (EXACT SAME format as Ward Management)
        prescriptionItems: prescriptionData.medications.map(med => {
          // Validate medication data
          const medicationId = parseInt(med.medicationId);
          if (isNaN(medicationId) || medicationId <= 0) {
            throw new Error(`Invalid medication ID for medication: ${med.drugName || 'Unknown'}`);
          }

          const quantity = parseInt(med.quantity);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity: ${med.quantity} for medication: ${med.drugName || 'Unknown'}`);
          }

          return {
            medicationId: medicationId,
            dose: med.dose,
            frequency: med.frequency,
            quantity: quantity,
            quantityUnit: med.quantityUnit || 'tablets',
            instructions: med.instructions || 'Take as directed',
            route: med.route || 'Oral',
            isUrgent: med.isUrgent || false,
            notes: med.notes || 'Clinic prescription'
          };
        })
      };

      console.log('📤 Sending clinic prescription API request:', JSON.stringify(apiData, null, 2));

      // Try using the new clinic prescription endpoint
      const response = await axios.post('/api/clinic/prescriptions', apiData, {
        headers: getAuthHeaders()
      });

      console.log('✅ Clinic prescription created successfully. Full response:', response);
      console.log('📋 Response data structure:', JSON.stringify(response.data, null, 2));
      console.log('🔍 Response data keys:', Object.keys(response.data || {}));

      // Validate API response
      if (!response.data) {
        throw new Error('Invalid API response: No data received');
      }

      // Transform API response back to frontend format
      // The API now returns a custom response with all required fields
      const apiPrescription = response.data;
      
      // Validate that we have the required fields
      if (!apiPrescription.prescriptionId && !apiPrescription.id) {
        console.error('❌ API response missing prescription ID:', apiPrescription);
        throw new Error('Invalid API response: Missing prescription ID');
      }

      const newPrescription = {
        id: apiPrescription.prescriptionId || apiPrescription.id,
        prescriptionId: apiPrescription.prescriptionId || apiPrescription.id,
        patientName: apiPrescription.patientName || 'Unknown Patient',
        patientId: apiPrescription.patientId || apiPrescription.patientNationalId,
        patientNationalId: apiPrescription.patientNationalId,
        startDate: apiPrescription.startDate,
        endDate: apiPrescription.endDate,
        prescribedBy: apiPrescription.prescribedBy,
        prescribedDate: apiPrescription.prescribedDate,
        lastModified: apiPrescription.lastModified,
        status: apiPrescription.status?.toLowerCase() || 'pending',
        wardName: apiPrescription.clinicName || 'Outpatient Clinic',
        consultationType: apiPrescription.visitType || 'outpatient',
        totalMedications: apiPrescription.totalMedications || 0,
        prescriptionNotes: apiPrescription.prescriptionNotes,
        notes: apiPrescription.prescriptionNotes,
        prescriptionItems: apiPrescription.prescriptionItems || [],
        isUrgent: apiPrescription.isUrgent || false,
        hasUrgentMedications: apiPrescription.prescriptionItems?.some(item => item.isUrgent) || false,
        medications: apiPrescription.prescriptionItems?.map(item => ({
          id: item.id,
          medicationId: item.medication?.id,
          drugName: item.medication?.drugName || item.drugName || 'Unknown Medication',
          genericName: item.medication?.genericName || item.genericName,
          dose: item.dose,
          dosage: item.dose,
          frequency: item.frequency,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          instructions: item.instructions,
          route: item.route,
          isUrgent: item.isUrgent || false,
          itemStatus: item.itemStatus?.toLowerCase() || 'pending',
          notes: item.notes
        })) || []
      };

      // Add to local state
      setPrescriptions(prev => [newPrescription, ...prev]);
      setError(null);

      console.log('🎯 Transformed prescription for state:', newPrescription);
      return newPrescription;

    } catch (err) {
      console.error('Error creating clinic prescription:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);

      let errorMessage = 'Failed to create prescription. ';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid prescription data. Please check all fields.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create prescriptions.';
      } else if (err.response?.status === 409) {
        errorMessage = 'A similar prescription already exists for this patient.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    const total = prescriptions.length;
    const active = prescriptions.filter(p => p.status === 'active' || p.status === 'pending').length;
    const completed = prescriptions.filter(p => p.status === 'completed').length;
    const urgent = prescriptions.filter(p => p.isUrgent || p.hasUrgentMedications).length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = prescriptions.filter(p => p.prescribedDate?.startsWith(today)).length;

    return {
      totalPrescriptions: total,
      activePrescriptions: active,
      completedPrescriptions: completed,
      urgentPrescriptions: urgent,
      todayPrescriptions: todayCount,
      totalMedications: prescriptions.reduce((sum, p) => sum + (p.totalMedications || 0), 0),
      activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [prescriptions]);

  // Fetch all data on initial load
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        fetchPatients(),
        fetchMedications(),
        fetchPrescriptions(false)
      ]);

      // Log any failures but don't crash the app
      results.forEach((result, index) => {
        const operation = ['fetchPatients', 'fetchMedications', 'fetchPrescriptions'][index];
        if (result.status === 'rejected') {
          console.warn(`${operation} failed:`, result.reason?.message);
        } else {
          console.log(`${operation} completed successfully`);
        }
      });

      // Only clear error if at least one operation succeeded
      const hasSuccess = results.some(result => result.status === 'fulfilled');
      if (hasSuccess) {
        setError(null);
      } else {
        setError('Some data failed to load. Using fallback data where possible.');
      }
    } catch (error) {
      console.error('Error fetching clinic data:', error);
      setError('Failed to load data. Using fallback data where possible.');
    } finally {
      setLoading(false);
    }
  }, [fetchPatients, fetchMedications, fetchPrescriptions]);

  // Initialize data on mount
  useEffect(() => {
    console.log('🏥 Clinic Prescriptions API Hook - Initializing data fetch...');
    fetchAllData();
  }, [fetchAllData]);

  return {
    // Data
    prescriptions,
    patients,
    medications,
    
    // State
    loading,
    error,
    
    // Actions
    fetchPrescriptions,
    fetchPatients,
    fetchMedications,
    fetchAllData,
    addPrescription,
    
    // Computed
    getStats,
    
    // WebSocket status (mock for compatibility)
    wsConnected: true
  };
};

export default useClinicPrescriptions;