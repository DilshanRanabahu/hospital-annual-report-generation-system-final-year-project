import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import useWebSocket from '../../../hooks/useWebSocket';

const usePrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [activePatients, setActivePatients] = useState([]);
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

  // Fetch available medications
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

      // Transform medication data for prescription use
      const transformedMedications = response.data.map(med => ({
        id: med.id,
        medicationId: med.id, // For API compatibility
        drugName: med.drugName,
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
        isActive: med.isActive
      }));

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

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active patients/admissions
  const fetchActivePatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.get('/api/admissions/active', {
        headers: getAuthHeaders()
      });

      // Transform API response and filter only active patients
      const transformedPatients = response.data
        .filter(admission =>
          admission.status === 'ACTIVE' &&
          !admission.dischargeDate && // No discharge date
          admission.wardId && // Has ward assignment
          admission.bedNumber // Has bed assignment
        )
        .map(admission => ({
          // Original API fields
          admissionId: admission.admissionId,
          patientNationalId: admission.patientNationalId,
          patientName: admission.patientName,
          wardId: admission.wardId,
          wardName: admission.wardName,
          bedNumber: admission.bedNumber,
          admissionDate: admission.admissionDate,
          dischargeDate: admission.dischargeDate,
          status: admission.status,

          // Additional fields for prescription management
          patientId: `P${admission.patientNationalId}`, // Create a patient ID format
          wardNumber: `W${admission.wardId}`, // Create ward number format
          fullName: admission.patientName, // Alias for consistency
          nationalId: admission.patientNationalId,

          // Calculated fields
          admissionDays: Math.floor((new Date() - new Date(admission.admissionDate)) / (1000 * 60 * 60 * 24)),
          isActive: true, // All patients here are active
          canReceivePrescription: true // Explicitly mark as eligible for prescriptions
        }));

      setActivePatients(transformedPatients);
      setError(null);
      return transformedPatients;

    } catch (err) {
      console.error('Error fetching active patients:', err);

      let errorMessage = 'Failed to fetch active patients. ';

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

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prescriptions from API
  const fetchPrescriptions = useCallback(async (includePatientsRefresh = false) => {
    try {
      setLoading(true);

      // Optionally fetch active patients first
      if (includePatientsRefresh) {
        try {
          await fetchActivePatients();
        } catch (error) {
          // Don't fail prescription fetch if patients fetch fails
          console.warn('Failed to fetch patients:', error.message);
        }
      }

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Fetch prescriptions from API
      const response = await axios.get('/api/prescriptions?page=0&size=100&sortBy=prescribedDate&sortOrder=desc', {
        headers: getAuthHeaders()
      });

      // Transform API response to match frontend expectations
      // Handle both paginated and non-paginated responses
      let prescriptionsData = [];
      if (response.data.data?.content) {
        // Paginated response
        prescriptionsData = response.data.data.content;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Direct array response
        prescriptionsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Simple array response
        prescriptionsData = response.data;
      }

      const transformedPrescriptions = prescriptionsData.map(prescription => ({
        // Map grouped prescription API response to frontend format
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
        wardName: prescription.wardName,
        bedNumber: prescription.bedNumber,
        admissionId: prescription.admissionId,

        // New grouped prescription fields
        totalMedications: prescription.totalMedications || 0,
        prescriptionNotes: prescription.prescriptionNotes,
        prescriptionItems: prescription.prescriptionItems || [],

        // Calculate derived fields from prescription items
        hasUrgentMedications: prescription.prescriptionItems?.some(item => item.isUrgent) || false,
        medications: prescription.prescriptionItems?.map(item => ({
          id: item.id,
          drugName: item.drugName,
          dose: item.dose,
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

        // For backwards compatibility, include first medication details
        drugName: prescription.prescriptionItems?.[0]?.drugName || '',
        dose: prescription.prescriptionItems?.[0]?.dose || '',
        frequency: prescription.prescriptionItems?.[0]?.frequency || '',
        quantity: prescription.prescriptionItems?.[0]?.quantity || 0,
        quantityUnit: prescription.prescriptionItems?.[0]?.quantityUnit || '',
        instructions: prescription.prescriptionItems?.[0]?.instructions || '',
        route: prescription.prescriptionItems?.[0]?.route || '',
        isUrgent: prescription.prescriptionItems?.some(item => item.isUrgent) || false
      }));

      setPrescriptions(transformedPrescriptions);
      setError(null);
      return transformedPrescriptions;

    } catch (err) {
      console.error('Error fetching prescriptions:', err);

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
      setPrescriptions([]); // Set empty array on error
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchActivePatients]);

  // Separate function to fetch both patients and prescriptions
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch both patients and prescriptions
      await Promise.allSettled([
        fetchActivePatients(),
        fetchPrescriptions(false) // Don't refresh patients again
      ]);

      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchActivePatients, fetchPrescriptions]);

  // Validate if patient is eligible for prescription
  const validatePatientEligibility = useCallback((patientNationalId) => {
    const patient = activePatients.find(p => p.patientNationalId === patientNationalId);

    if (!patient) {
      throw new Error('Patient not found in active admissions. Only active patients can receive prescriptions.');
    }

    if (!patient.isActive || !patient.canReceivePrescription) {
      throw new Error('Patient is not eligible for prescriptions. Only currently admitted patients can receive prescriptions.');
    }

    if (patient.dischargeDate) {
      throw new Error('Patient has been discharged and cannot receive new prescriptions.');
    }

    if (!patient.wardId || !patient.bedNumber) {
      throw new Error('Patient must be assigned to a ward and bed before receiving prescriptions.');
    }

    return patient;
  }, [activePatients]);

  // Add new prescription
  const addPrescription = useCallback(async (prescriptionData) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Validate patient eligibility before creating prescription
      validatePatientEligibility(prescriptionData.patientNationalId);

      // Comprehensive validation before API call
      console.log('🔍 Validating prescription data:', prescriptionData);
      
      // Validate required fields
      if (!prescriptionData.patientNationalId) {
        throw new Error('Patient National ID is required');
      }
      
      if (!prescriptionData.admissionId) {
        throw new Error('Admission ID is required');
      }
      
      // Ensure admissionId is a valid number
      const admissionId = parseInt(prescriptionData.admissionId);
      if (isNaN(admissionId) || admissionId <= 0) {
        throw new Error(`Invalid admission ID: ${prescriptionData.admissionId}`);
      }

      // Transform frontend data to grouped prescription API format
      const apiData = {
        patientNationalId: prescriptionData.patientNationalId,
        admissionId: admissionId, // Ensure it's a number
        prescribedBy: prescriptionData.prescribedBy || 'Ward Doctor', // Use string instead of doctor ID
        startDate: prescriptionData.startDate,
        endDate: prescriptionData.endDate,
        prescriptionNotes: prescriptionData.prescriptionNotes || '',
        prescriptionItems: prescriptionData.medications?.map(med => {
          // Validate each medication
          const medicationId = parseInt(med.medicationId);
          if (isNaN(medicationId) || medicationId <= 0) {
            throw new Error(`Invalid medication ID: ${med.medicationId} for medication: ${med.name || 'Unknown'}`);
          }
          
          const quantity = parseInt(med.quantity);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity: ${med.quantity} for medication: ${med.name || 'Unknown'}`);
          }
          
          return {
            medicationId: medicationId, // Ensure it's a number
            dose: med.dose,
            frequency: med.frequency,
            quantity: quantity, // Ensure it's a number
            quantityUnit: med.quantityUnit,
            instructions: med.instructions,
            route: med.route,
            isUrgent: med.isUrgent || false,
            notes: med.notes
          };
        }) || [
          // Fallback for single medication format (backwards compatibility)
          (() => {
            const medicationId = parseInt(prescriptionData.medicationId);
            if (isNaN(medicationId) || medicationId <= 0) {
              throw new Error(`Invalid medication ID: ${prescriptionData.medicationId}`);
            }
            
            const quantity = parseInt(prescriptionData.quantity);
            if (isNaN(quantity) || quantity <= 0) {
              throw new Error(`Invalid quantity: ${prescriptionData.quantity}`);
            }
            
            return {
              medicationId: medicationId, // Ensure it's a number
              dose: prescriptionData.dose,
              frequency: prescriptionData.frequency,
              quantity: quantity, // Ensure it's a number
              quantityUnit: prescriptionData.quantityUnit,
              instructions: prescriptionData.instructions,
              route: prescriptionData.route,
              isUrgent: prescriptionData.isUrgent || false,
              notes: prescriptionData.notes
            };
          })()
        ]
      };

      console.log('📤 Sending validated API data:', JSON.stringify(apiData, null, 2));

      const response = await axios.post('/api/prescriptions', apiData, {
        headers: getAuthHeaders()
      });

      // Transform grouped prescription API response to frontend format
      const apiPrescription = response.data.data;
      const newPrescription = {
        id: apiPrescription.prescriptionId || apiPrescription.id,
        prescriptionId: apiPrescription.prescriptionId,
        patientName: apiPrescription.patientName,
        patientId: apiPrescription.patientId,
        patientNationalId: apiPrescription.patientNationalId,
        startDate: apiPrescription.startDate,
        endDate: apiPrescription.endDate,
        prescribedBy: apiPrescription.prescribedBy,
        prescribedDate: apiPrescription.prescribedDate,
        lastModified: apiPrescription.lastModified,
        status: apiPrescription.status?.toLowerCase() || 'active',
        wardName: apiPrescription.wardName,
        bedNumber: apiPrescription.bedNumber,
        admissionId: apiPrescription.admissionId,

        // New grouped prescription fields
        totalMedications: apiPrescription.totalMedications || 0,
        prescriptionNotes: apiPrescription.prescriptionNotes,
        prescriptionItems: apiPrescription.prescriptionItems || [],

        // Calculate derived fields
        hasUrgentMedications: apiPrescription.prescriptionItems?.some(item => item.isUrgent) || false,
        medications: apiPrescription.prescriptionItems?.map(item => ({
          id: item.id,
          drugName: item.drugName,
          dose: item.dose,
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

        // For backwards compatibility, include first medication details
        drugName: apiPrescription.prescriptionItems?.[0]?.drugName || '',
        dose: apiPrescription.prescriptionItems?.[0]?.dose || '',
        frequency: apiPrescription.prescriptionItems?.[0]?.frequency || '',
        quantity: apiPrescription.prescriptionItems?.[0]?.quantity || 0,
        quantityUnit: apiPrescription.prescriptionItems?.[0]?.quantityUnit || '',
        instructions: apiPrescription.prescriptionItems?.[0]?.instructions || '',
        route: apiPrescription.prescriptionItems?.[0]?.route || '',
        isUrgent: apiPrescription.prescriptionItems?.some(item => item.isUrgent) || false
      };

      // Add to local state
      setPrescriptions(prev => [newPrescription, ...prev]);
      setError(null);
      return newPrescription;

    } catch (err) {
      console.error('Error adding prescription:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);

      let errorMessage = 'Failed to add prescription. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create prescriptions.';
      } else if (err.response?.status === 409) {
        errorMessage = 'Duplicate prescription: Patient already has an active prescription for this medication.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid prescription data. Please check your inputs.';
      } else if (err.response?.status === 500) {
        // Enhanced 500 error reporting
        const backendError = err.response.data?.message || err.response.data?.error;
        if (backendError) {
          errorMessage = `Server error: ${backendError}`;
          console.error('🚨 Backend 500 error details:', backendError);
        } else {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        console.error('🚨 Full 500 error response:', err.response.data);
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
  }, [validatePatientEligibility]);

  // Add medication to existing prescription
  const addPrescriptionItem = useCallback(async (prescriptionId, medicationData) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Transform medication data to API format
      const itemData = {
        medicationId: medicationData.medicationId, // Required: Medication entity relationship
        dose: medicationData.dose,
        frequency: medicationData.frequency,
        quantity: parseInt(medicationData.quantity),
        quantityUnit: medicationData.quantityUnit,
        instructions: medicationData.instructions,
        route: medicationData.route,
        isUrgent: medicationData.isUrgent || false,
        notes: medicationData.notes
      };

      const response = await axios.post(
        `/api/prescriptions/${prescriptionId}/items`,
        itemData,
        { headers: getAuthHeaders() }
      );

      // Update local state with the updated prescription
      const updatedPrescription = response.data.data;
      setPrescriptions(prev =>
        prev.map(prescription =>
          prescription.id === prescriptionId || prescription.prescriptionId === prescriptionId
            ? {
                ...prescription,
                totalMedications: updatedPrescription.totalMedications,
                prescriptionItems: updatedPrescription.prescriptionItems,
                medications: updatedPrescription.prescriptionItems?.map(item => ({
                  id: item.id,
                  drugName: item.drugName,
                  dose: item.dose,
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
                hasUrgentMedications: updatedPrescription.prescriptionItems?.some(item => item.isUrgent) || false,
                lastModified: new Date().toISOString()
              }
            : prescription
        )
      );

      setError(null);
      return updatedPrescription;

    } catch (err) {
      console.error('Error adding prescription item:', err);

      let errorMessage = 'Failed to add medication. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to add medications.';
      } else if (err.response?.status === 409) {
        errorMessage = 'Duplicate medication: Patient already has this medication in their prescription.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid medication data. Please check your inputs.';
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

  // Remove medication from prescription
  const removePrescriptionItem = useCallback(async (prescriptionId, itemId) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.delete(
        `/api/prescriptions/${prescriptionId}/items/${itemId}`,
        { headers: getAuthHeaders() }
      );

      // Update local state with the updated prescription
      const updatedPrescription = response.data.data;
      setPrescriptions(prev =>
        prev.map(prescription =>
          prescription.id === prescriptionId || prescription.prescriptionId === prescriptionId
            ? {
                ...prescription,
                totalMedications: updatedPrescription.totalMedications,
                prescriptionItems: updatedPrescription.prescriptionItems,
                medications: updatedPrescription.prescriptionItems?.map(item => ({
                  id: item.id,
                  drugName: item.drugName,
                  dose: item.dose,
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
                hasUrgentMedications: updatedPrescription.prescriptionItems?.some(item => item.isUrgent) || false,
                lastModified: new Date().toISOString()
              }
            : prescription
        )
      );

      setError(null);
      return updatedPrescription;

    } catch (err) {
      console.error('Error removing prescription item:', err);

      let errorMessage = 'Failed to remove medication. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to remove medications.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Medication not found. It may have already been removed.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid request. Please try again.';
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

  // Update prescription status
  const updatePrescription = useCallback(async (prescriptionId, updateData) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // For status updates, use the status endpoint
      if (updateData.status && Object.keys(updateData).length === 1) {
        await axios.put(
          `/api/prescriptions/${prescriptionId}/status?status=${updateData.status.toUpperCase()}`,
          {},
          { headers: getAuthHeaders() }
        );

        // Update local state
        setPrescriptions(prev =>
          prev.map(prescription =>
            prescription.id === prescriptionId || prescription.prescriptionId === prescriptionId
              ? { ...prescription, status: updateData.status.toLowerCase(), lastModified: new Date().toISOString() }
              : prescription
          )
        );
      } else {
        // For full updates, use the regular update endpoint
        await axios.put(`/api/prescriptions/${prescriptionId}`, updateData, {
          headers: getAuthHeaders()
        });

        // Update local state
        setPrescriptions(prev =>
          prev.map(prescription =>
            prescription.id === prescriptionId || prescription.prescriptionId === prescriptionId
              ? { ...prescription, ...updateData, lastModified: new Date().toISOString() }
              : prescription
          )
        );
      }

      setError(null);
      return true;

    } catch (err) {
      console.error('Error updating prescription:', err);

      let errorMessage = 'Failed to update prescription. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to update prescriptions.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Prescription not found. It may have been deleted.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid update data. Please check your inputs.';
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

  // Delete prescription
  const deletePrescription = useCallback(async (prescriptionId) => {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      await axios.delete(`/api/prescriptions/${prescriptionId}`, {
        headers: getAuthHeaders()
      });

      // Update local state
      setPrescriptions(prev => prev.filter(prescription =>
        prescription.id !== prescriptionId && prescription.prescriptionId !== prescriptionId
      ));

      setError(null);
      return true;

    } catch (err) {
      console.error('Error deleting prescription:', err);

      let errorMessage = 'Failed to delete prescription. ';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to delete prescriptions.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Prescription not found. It may have already been deleted.';
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

  // Calculate prescription statistics (updated for grouped prescriptions)
  const getStats = useCallback(() => {
    // Calculate total medications across all prescriptions
    const totalMedications = prescriptions.reduce((sum, p) => sum + (p.totalMedications || 0), 0);

    return {
      total: prescriptions.length,
      active: prescriptions.filter(p => p.status === 'active').length,
      completed: prescriptions.filter(p => p.status === 'completed').length,
      expired: prescriptions.filter(p => p.status === 'expired').length,
      discontinued: prescriptions.filter(p => p.status === 'discontinued').length,
      todaysPrescriptions: prescriptions.filter(p => {
        const prescDate = new Date(p.prescribedDate);
        const today = new Date();
        return prescDate.toDateString() === today.toDateString();
      }).length,
      urgentPrescriptions: prescriptions.filter(p => p.hasUrgentMedications).length,
      activePatients: activePatients.length,

      // New statistics for grouped prescriptions
      totalMedications: totalMedications,
      activeMedications: prescriptions
        .filter(p => p.status === 'active')
        .reduce((sum, p) => sum + (p.totalMedications || 0), 0),
      averageMedicationsPerPrescription: prescriptions.length > 0
        ? Math.round((totalMedications / prescriptions.length) * 10) / 10
        : 0,
      prescriptionsWithUrgentMeds: prescriptions.filter(p => p.hasUrgentMedications).length
    };
  }, [prescriptions, activePatients]);

  // WebSocket handler for real-time prescription status updates from Pharmacy
  const handlePrescriptionWebSocketUpdate = useCallback((data) => {
    console.log('🔔 Ward received WebSocket update:', data);

    if (data.type === 'PRESCRIPTION_DISPENSED') {
      // Update prescription status to COMPLETED when pharmacy dispenses
      setPrescriptions(prev => prev.map(prescription =>
        prescription.prescriptionId === data.prescription.prescriptionId
          ? {
              ...prescription,
              status: data.prescription.status?.toLowerCase() || 'completed',
              lastModified: data.prescription.lastModified || new Date().toISOString()
            }
          : prescription
      ));
      console.log('✅ Prescription status updated to COMPLETED:', data.prescription.prescriptionId);
    } else if (data.type === 'PRESCRIPTION_UPDATED') {
      // Handle other prescription updates
      setPrescriptions(prev => prev.map(prescription =>
        prescription.prescriptionId === data.prescription.prescriptionId
          ? {
              ...prescription,
              ...data.prescription,
              status: data.prescription.status?.toLowerCase(),
              lastModified: data.prescription.lastModified || new Date().toISOString()
            }
          : prescription
      ));
      console.log('✅ Prescription updated:', data.prescription.prescriptionId);
    }
  }, []);

  // WebSocket subscription configuration
  const subscriptions = {
    '/topic/prescriptions': handlePrescriptionWebSocketUpdate
  };

  const wsOptions = {
    debug: import.meta.env.NODE_ENV === 'development',
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ Ward connected to Prescription WebSocket');
    },
    onDisconnect: () => {
      console.log('🔌 Ward disconnected from Prescription WebSocket');
    },
    onError: (error) => {
      console.error('❌ Ward WebSocket error:', error);
    }
  };

  // Initialize WebSocket connection
  const { isConnected: wsConnected, error: wsError } = useWebSocket(
    '/ws',
    subscriptions,
    wsOptions
  );

  // Auto-fetch on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    // Data
    prescriptions,
    activePatients,
    medications,
    loading,
    error,

    // WebSocket status
    wsConnected,
    wsError,

    // Functions
    fetchActivePatients,
    fetchPrescriptions,
    fetchMedications,
    addPrescription,
    updatePrescription,
    deletePrescription,
    getStats,
    validatePatientEligibility,

    // New grouped prescription functions
    addPrescriptionItem,
    removePrescriptionItem,

    // Refresh function
    refresh: fetchAllData
  };
};

export default usePrescriptions;