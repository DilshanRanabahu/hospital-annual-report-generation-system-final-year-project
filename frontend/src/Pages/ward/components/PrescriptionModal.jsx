import React, { useState, useEffect, useCallback } from 'react';
import { X, Pill, AlertCircle, FileText, User, Search, Minus, AlertTriangle } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import axios from 'axios';


const PrescriptionModal = ({ isOpen, onClose, activePatients = [], onPrescriptionAdded }) => {
  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Medication selection state
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [medicationSearchTerm, setMedicationSearchTerm] = useState('');
  const [availableMedications, setAvailableMedications] = useState([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [medicationsError, setMedicationsError] = useState(null);
  const [medicationsFetched, setMedicationsFetched] = useState(false);

  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // Prescription metadata (simplified - removed duration and general notes)
  const [prescriptionData, setPrescriptionData] = useState({
    startDate: new Date().toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notifications = useNotifications();

  // Validation functions
  const validatePatientSelection = () => {
    if (!selectedPatient) {
      return 'Please select a patient before proceeding';
    }
    if (!selectedPatient.patientName || !selectedPatient.patientNationalId) {
      return 'Selected patient has incomplete information';
    }
    if (!selectedPatient.admissionId) {
      return 'Patient must be admitted to receive prescriptions';
    }
    if (!selectedPatient.wardName || !selectedPatient.bedNumber) {
      return 'Patient location information is missing';
    }
    return null;
  };

  const validateMedications = () => {
    const errors = {};

    if (selectedMedications.length === 0) {
      errors.medications = 'Please add at least one medication';
      return errors;
    }

    if (selectedMedications.length > 10) {
      errors.medications = 'Maximum 10 medications allowed per prescription';
    }

    selectedMedications.forEach((medication, index) => {
      const medicationErrors = {};

      // Validate medication name
      if (!medication.name || medication.name.trim() === '') {
        medicationErrors.name = 'Medication name is required';
      }

      // Validate dosage
      if (!medication.dosage || medication.dosage.trim() === '') {
        medicationErrors.dosage = 'Dosage is required';
      } else {
        // Enhanced dosage format validation with more units
        const dosagePattern = /^\d+(\.\d{1,3})?\s*(mg|g|ml|mcg|μg|iu|unit|units?|tab|tabs?|cap|caps?|drop|drops?|puff|puffs?|spray|sprays?|patch|patches?)$/i;
        if (!dosagePattern.test(medication.dosage.trim())) {
          medicationErrors.dosage = 'Invalid dosage format (e.g., 500mg, 1.5g, 10ml, 2tabs, 1puff)';
        } else {
          // Check for reasonable dosage ranges
          const numericValue = parseFloat(medication.dosage.match(/^\d+(\.\d+)?/)[0]);
          const unit = medication.dosage.replace(/[\d.\s]/g, '').toLowerCase();

          // Set reasonable limits per unit type
          const dosageLimits = {
            'mg': { min: 0.1, max: 5000 },
            'mcg': { min: 0.1, max: 10000 },
            'μg': { min: 0.1, max: 10000 },
            'g': { min: 0.01, max: 50 },
            'ml': { min: 0.1, max: 1000 },
            'iu': { min: 1, max: 100000 },
            'unit': { min: 1, max: 1000 },
            'units': { min: 1, max: 1000 },
            'tab': { min: 0.25, max: 20 },
            'tabs': { min: 0.25, max: 20 },
            'cap': { min: 0.5, max: 20 },
            'caps': { min: 0.5, max: 20 },
            'drop': { min: 1, max: 50 },
            'drops': { min: 1, max: 50 },
            'puff': { min: 1, max: 20 },
            'puffs': { min: 1, max: 20 },
            'spray': { min: 1, max: 10 },
            'sprays': { min: 1, max: 10 },
            'patch': { min: 0.5, max: 10 },
            'patches': { min: 0.5, max: 10 }
          };

          const limits = dosageLimits[unit];
          if (limits && (numericValue < limits.min || numericValue > limits.max)) {
            medicationErrors.dosage = `Dosage should be between ${limits.min} and ${limits.max} ${unit}`;
          }
        }
      }

      // Validate frequency
      if (!medication.frequency || medication.frequency.trim() === '') {
        medicationErrors.frequency = 'Frequency is required';
      } else {
        const validFrequencies = [
          'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)',
          'Four times daily (QDS)', 'As needed (PRN)', 'Before meals',
          'After meals', 'At bedtime', 'As per sliding scale'
        ];
        if (!validFrequencies.includes(medication.frequency)) {
          medicationErrors.frequency = 'Please select a valid frequency';
        }
      }

      // Validate quantity
      if (!medication.quantity || medication.quantity.trim() === '') {
        medicationErrors.quantity = 'Quantity is required';
      } else {
        const quantity = parseFloat(medication.quantity);
        if (isNaN(quantity)) {
          medicationErrors.quantity = 'Quantity must be a number';
        } else if (quantity <= 0) {
          medicationErrors.quantity = 'Quantity must be greater than 0';
        } else if (quantity > 1000) {
          medicationErrors.quantity = 'Quantity exceeds maximum limit (1000)';
        } else {
          // Enhanced validation for different dosage forms
          const dosageForm = (medication.dosageForm || '').toLowerCase();

          // Check decimal precision based on dosage form
          const decimals = (quantity.toString().split('.')[1] || '').length;

          if (['tablet', 'capsule', 'suppository', 'patch'].includes(dosageForm)) {
            if (quantity % 0.5 !== 0) {
              medicationErrors.quantity = 'Quantity for tablets/capsules must be in increments of 0.5';
            }
          } else if (['injection', 'vial', 'ampoule'].includes(dosageForm)) {
            if (quantity % 1 !== 0) {
              medicationErrors.quantity = 'Quantity for injections must be whole numbers';
            }
          } else if (['syrup', 'suspension', 'solution'].includes(dosageForm)) {
            if (decimals > 1) {
              medicationErrors.quantity = 'Liquid quantities should not exceed 1 decimal place';
            }
            if (quantity < 5) {
              medicationErrors.quantity = 'Minimum liquid quantity is 5ml';
            }
          }

          // Check for reasonable quantity limits by category
          const category = (medication.category || '').toLowerCase();
          if (category.includes('controlled') || category.includes('narcotic')) {
            if (quantity > 30) {
              medicationErrors.quantity = 'Controlled substances limited to 30 units maximum';
            }
          }
        }
      }

      // Validate against available stock
      if (medication.currentStock !== undefined && medication.quantity) {
        const requestedQuantity = parseFloat(medication.quantity);
        if (!isNaN(requestedQuantity) && requestedQuantity > medication.currentStock) {
          if (medication.currentStock === 0) {
            medicationErrors.quantity = `${medication.drugName} is currently out of stock`;
          } else {
            medicationErrors.quantity = `Only ${medication.currentStock} ${getQuantityUnit(medication.dosageForm)} available in stock`;
          }
        }
      }

      // Validate instructions
      if (medication.instructions) {
        if (medication.instructions.length > 500) {
          medicationErrors.instructions = 'Instructions too long (max 500 characters)';
        } else if (medication.instructions.trim().length > 0 && medication.instructions.trim().length < 3) {
          medicationErrors.instructions = 'Instructions too short (min 3 characters)';
        }

        // Enhanced safety checks for dangerous instructions
        const dangerousWords = [
          'overdose', 'double dose', 'triple dose', 'quadruple dose',
          'as much as possible', 'unlimited', 'no limit', 'maximum dose',
          'crush and inject', 'inject', 'snort', 'abuse',
          'all at once', 'entire bottle', 'whole pack'
        ];
        const containsDangerous = dangerousWords.some(word =>
          medication.instructions.toLowerCase().includes(word)
        );
        if (containsDangerous) {
          medicationErrors.instructions = 'Instructions contain potentially unsafe language';
        }

        // Check for contradictory instructions
        const contradictoryPairs = [
          ['with food', 'on empty stomach'],
          ['before meals', 'after meals'],
          ['morning', 'bedtime'],
          ['with milk', 'avoid dairy']
        ];

        const lowerInstructions = medication.instructions.toLowerCase();
        for (const [term1, term2] of contradictoryPairs) {
          if (lowerInstructions.includes(term1) && lowerInstructions.includes(term2)) {
            medicationErrors.instructions = `Instructions contain contradictory terms: '${term1}' and '${term2}'`;
            break;
          }
        }
      }

      // Validate expiry date if available
      if (medication.expiryDate) {
        const expiryDate = new Date(medication.expiryDate);
        const today = new Date();
        if (expiryDate < today) {
          medicationErrors.expiry = 'This medication has expired and cannot be prescribed';
        } else if (expiryDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          medicationErrors.expiry = 'Warning: This medication expires within 30 days';
        }
      }

      if (Object.keys(medicationErrors).length > 0) {
        errors[`medication_${index}`] = medicationErrors;
      }
    });

    return errors;
  };

  const validatePrescriptionData = () => {
    const errors = {};
    // No prescription data validation needed since start date section was removed
    return errors;
  };

  const validateDuplicateMedications = () => {
    const errors = [];
    const drugNames = selectedMedications.map(med => med.name?.toLowerCase().trim()).filter(Boolean);
    const genericNames = selectedMedications.map(med => med.genericName?.toLowerCase().trim()).filter(Boolean);

    // Check for duplicate drug names
    const duplicates = drugNames.filter((drug, index) => drugNames.indexOf(drug) !== index);
    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      errors.push(`Duplicate medications detected: ${uniqueDuplicates.join(', ')}`);
    }

    // Check for duplicate generic names (same drug, different brand)
    const genericDuplicates = genericNames.filter((generic, index) => genericNames.indexOf(generic) !== index);
    if (genericDuplicates.length > 0) {
      const uniqueGenericDuplicates = [...new Set(genericDuplicates)];
      errors.push(`Duplicate active ingredients detected: ${uniqueGenericDuplicates.join(', ')}`);
    }

    // Enhanced drug interaction checking
    const dangerousCombinations = [
      // Bleeding risk combinations
      { drugs: ['warfarin', 'aspirin'], warning: 'Warfarin and Aspirin combination increases bleeding risk' },
      { drugs: ['warfarin', 'clopidogrel'], warning: 'Warfarin and Clopidogrel combination increases bleeding risk' },
      { drugs: ['heparin', 'aspirin'], warning: 'Heparin and Aspirin combination increases bleeding risk' },

      // Cardiovascular interactions
      { drugs: ['digoxin', 'furosemide'], warning: 'Digoxin and Furosemide may cause electrolyte imbalance' },
      { drugs: ['ace inhibitor', 'potassium'], warning: 'ACE inhibitors with potassium may cause hyperkalemia' },
      { drugs: ['beta blocker', 'verapamil'], warning: 'Beta blockers with Verapamil may cause heart block' },

      // CNS interactions
      { drugs: ['morphine', 'lorazepam'], warning: 'Opioids with Benzodiazepines increase respiratory depression risk' },
      { drugs: ['tramadol', 'sertraline'], warning: 'Tramadol with SSRIs increases serotonin syndrome risk' },
      { drugs: ['phenytoin', 'warfarin'], warning: 'Phenytoin affects Warfarin metabolism' },

      // Diabetic medications
      { drugs: ['metformin', 'insulin'], warning: 'Monitor blood glucose closely with Metformin and Insulin' },
      { drugs: ['glipizide', 'metformin'], warning: 'Monitor for hypoglycemia with multiple antidiabetic drugs' },

      // Antibiotic interactions
      { drugs: ['clarithromycin', 'warfarin'], warning: 'Clarithromycin increases Warfarin effect' },
      { drugs: ['ciprofloxacin', 'theophylline'], warning: 'Ciprofloxacin increases Theophylline toxicity risk' },

      // Gastric medications
      { drugs: ['omeprazole', 'clopidogrel'], warning: 'PPI may reduce Clopidogrel effectiveness' },

      // Multiple same-class drugs
      { drugs: ['lisinopril', 'enalapril'], warning: 'Multiple ACE inhibitors should not be used together' },
      { drugs: ['amlodipine', 'nifedipine'], warning: 'Multiple calcium channel blockers may cause hypotension' }
    ];

    // Check interactions using both drug names and generic names
    const allDrugTerms = [...drugNames, ...genericNames];

    dangerousCombinations.forEach(combo => {
      const foundDrugs = combo.drugs.filter(drug =>
        allDrugTerms.some(selectedDrug => selectedDrug.includes(drug))
      );
      if (foundDrugs.length >= 2) {
        errors.push(combo.warning);
      }
    });

    // Check for multiple drugs of same category
    const categories = selectedMedications.map(med => med.category?.toLowerCase().trim()).filter(Boolean);
    const problematicCategories = ['analgesic', 'antibiotic', 'antihypertensive', 'diuretic'];

    problematicCategories.forEach(category => {
      const categoryCount = categories.filter(cat => cat.includes(category)).length;
      if (categoryCount > 2) {
        errors.push(`Multiple ${category} medications detected - review for appropriateness`);
      }
    });

    return errors.length > 0 ? errors.join('; ') : null;
  };

  const validateForm = () => {
    setIsValidating(true);
    const errors = {};

    // Patient validation
    const patientError = validatePatientSelection();
    if (patientError) {
      errors.patient = patientError;
    }

    // Medication validation
    const medicationErrors = validateMedications();
    Object.assign(errors, medicationErrors);

    // Prescription data validation
    const prescriptionErrors = validatePrescriptionData();
    Object.assign(errors, prescriptionErrors);

    // Duplicate medication validation
    const duplicateError = validateDuplicateMedications();
    if (duplicateError) {
      errors.duplicates = duplicateError;
    }

    setValidationErrors(errors);
    setIsValidating(false);

    return Object.keys(errors).length === 0;
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  const clearFieldError = (fieldName) => {
    if (validationErrors[fieldName]) {
      const newErrors = { ...validationErrors };
      delete newErrors[fieldName];
      setValidationErrors(newErrors);
    }
  };

  // Get JWT token for authentication
  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem('jwtToken');
    return {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    };
  };


  // Fetch medications from API
  const fetchMedications = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (medicationsLoading || medicationsFetched) {
      return;
    }

    try {
      setMedicationsLoading(true);
      setMedicationsError(null);

      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        setAvailableMedications([]);
        setMedicationsError('Authentication required. Please log in again.');
        notifications.error('Authentication Error', 'No valid session found. Please log in again.');
        setMedicationsFetched(true);
        return;
      }

      // Fetch from pharmacy medications API endpoint
      const response = await axios.get('/api/pharmacy/medications/getAll', {
        headers: getAuthHeaders(),
        timeout: 10000 // 10 second timeout
      });

      // Handle successful response
      if (response.data && Array.isArray(response.data)) {
        // Direct array response
        const transformedMedications = response.data.map(med => ({
          id: med.id, // Use the actual database ID
          name: med.drugName || med.name || med.medicationName,
          genericName: med.genericName,
          category: med.category || med.drugCategory,
          strength: med.strength || med.dosage,
          dosageForm: med.dosageForm || med.form,
          manufacturer: med.manufacturer || 'Unknown',
          currentStock: med.currentStock || med.quantityInStock || 0,
          unitCost: med.unitCost || med.price || 0,
          expiryDate: med.expiryDate || med.expiry,
          isActive: med.isActive !== false, // Default to true if not specified
          dosages: generateDosageOptions(med.strength || med.dosage, med.dosageForm || med.form),
          frequencies: getStandardFrequencies(med.category || med.drugCategory),
          commonInstructions: getInstructionsForCategory(med.category || med.drugCategory, med.genericName)
        }));

        // Filter active medications (include those with 0 stock but mark them)
        const activeMedications = transformedMedications.filter(med =>
          med.isActive && med.name
        );

        if (activeMedications.length > 0) {
          setAvailableMedications(activeMedications);
        } else {
          setAvailableMedications([]);
          setMedicationsError('No active medications with stock found in pharmacy system.');
          notifications.warning('No Medications Available', 'No active medications with stock found in the pharmacy system.');
        }
      } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
        // Paginated response
        const transformedMedications = response.data.content.map(med => ({
          id: med.id, // Use the actual database ID
          name: med.drugName || med.name || med.medicationName,
          genericName: med.genericName,
          category: med.category || med.drugCategory,
          strength: med.strength || med.dosage,
          dosageForm: med.dosageForm || med.form,
          manufacturer: med.manufacturer || 'Unknown',
          currentStock: med.currentStock || med.quantityInStock || 0,
          unitCost: med.unitCost || med.price || 0,
          expiryDate: med.expiryDate || med.expiry,
          isActive: med.isActive !== false,
          dosages: generateDosageOptions(med.strength || med.dosage, med.dosageForm || med.form),
          frequencies: getStandardFrequencies(med.category || med.drugCategory),
          commonInstructions: getInstructionsForCategory(med.category || med.drugCategory, med.genericName)
        }));

        const activeMedications = transformedMedications.filter(med =>
          med.isActive && med.currentStock > 0 && med.name
        );

        if (activeMedications.length > 0) {
          setAvailableMedications(activeMedications);
        } else {
          setAvailableMedications([]);
          setMedicationsError('No active medications with stock found in pharmacy system.');
          notifications.warning('No Medications Available', 'No active medications with stock found in the pharmacy system.');
        }
      } else {
        setAvailableMedications([]);
        setMedicationsError('Unexpected response format from pharmacy API.');
        notifications.error('API Response Error', 'Received unexpected data format from pharmacy medications API.');
      }

    } catch (err) {
      console.error('Error fetching medications from pharmacy API:', err);

      // Set error state instead of fallback
      setAvailableMedications([]);

      let errorMessage = 'Failed to fetch medications from pharmacy API.';

      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied to pharmacy medications.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Pharmacy medications endpoint not found.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Pharmacy server error occurred.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Pharmacy API request timeout.';
      } else if (!err.response) {
        errorMessage = 'Network error accessing pharmacy API.';
      }

      setMedicationsError(errorMessage);

      // Show error notification
      notifications.error('Medications Loading Failed', errorMessage);

    } finally {
      setMedicationsLoading(false);
      setMedicationsFetched(true);
    }
  }, [medicationsLoading, medicationsFetched, notifications]);

  // Generate dosage options based on strength
  const generateDosageOptions = (strength, dosageForm) => {
    const baseStrength = parseInt(strength);
    if (isNaN(baseStrength)) return [strength];

    const unit = strength.replace(/[0-9]/g, '');

    // Generate common dosage multiples
    const multipliers = dosageForm.toLowerCase().includes('tablet') || dosageForm.toLowerCase().includes('capsule')
      ? [0.5, 1, 2]
      : [1];

    return multipliers.map(mult => `${baseStrength * mult}${unit}`);
  };

  // Get standard frequencies based on medication category
  const getStandardFrequencies = (category) => {
    const frequencyMap = {
      'Analgesic': ['Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QDS)', 'As needed (PRN)'],
      'Antibiotic': ['Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QDS)'],
      'Antidiabetic': ['Once daily (OD)', 'Twice daily (BD)', 'Before meals', 'As per sliding scale'],
      'Antihypertensive': ['Once daily (OD)', 'Twice daily (BD)'],
      'Diuretic': ['Once daily (OD)', 'Twice daily (BD)'],
      'Statin': ['Once daily (OD)', 'At bedtime'],
      'Proton Pump Inhibitor': ['Once daily (OD)', 'Twice daily (BD)'],
      default: ['Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QDS)']
    };

    return frequencyMap[category] || frequencyMap.default;
  };


  // Get default quantity based on dosage form
  const getDefaultQuantity = (dosageForm) => {
    const quantityMap = {
      'Tablet': '30', // 30 tablets
      'Capsule': '30', // 30 capsules
      'Syrup': '200', // 200ml
      'Suspension': '200', // 200ml
      'Injection': '5', // 5 vials
      'Suppository': '10', // 10 pieces
      'Cream': '50', // 50g
      'Ointment': '50', // 50g
      'Drops': '10', // 10ml
      'Inhaler': '1', // 1 inhaler
      'Patch': '10', // 10 patches
      default: '30'
    };

    return quantityMap[dosageForm] || quantityMap.default;
  };

  // Get quantity unit based on dosage form
  const getQuantityUnit = (dosageForm) => {
    const unitMap = {
      'Tablet': 'tablets',
      'Capsule': 'capsules',
      'Syrup': 'ml',
      'Suspension': 'ml',
      'Injection': 'vials',
      'Suppository': 'pieces',
      'Cream': 'g',
      'Ointment': 'g',
      'Drops': 'ml',
      'Inhaler': 'inhaler(s)',
      'Patch': 'patches',
      default: 'units'
    };

    return unitMap[dosageForm] || unitMap.default;
  };

  // Get instructions based on category and generic name
  const getInstructionsForCategory = (category, genericName) => {
    const instructionMap = {
      'Analgesic': 'Take as directed. Do not exceed recommended dose.',
      'Antibiotic': 'Take with food. Complete the full course even if feeling better.',
      'Antidiabetic': 'Take with meals. Monitor blood sugar levels regularly.',
      'Antihypertensive': 'Take at the same time each day. Monitor blood pressure.',
      'Diuretic': 'Take in the morning. Monitor fluid balance.',
      'Statin': 'Take at bedtime. Monitor liver function.',
      'Proton Pump Inhibitor': 'Take before breakfast. Swallow whole, do not crush.',
      default: 'Take as prescribed by your doctor.'
    };

    // Special cases for specific generic names
    if (genericName?.toLowerCase().includes('insulin')) {
      return 'Administer as prescribed. Monitor blood glucose levels regularly.';
    }
    if (genericName?.toLowerCase().includes('paracetamol')) {
      return 'Take with or without food. Do not exceed 4g in 24 hours.';
    }

    return instructionMap[category] || instructionMap.default;
  };

  // Filter patients based on search
  const filteredPatients = activePatients.filter(patient =>
    patient.patientName.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    patient.patientNationalId.toString().includes(patientSearchTerm) ||
    patient.wardName.toLowerCase().includes(patientSearchTerm.toLowerCase())
  );

  // Filter medications based on search (with safety checks)
  const filteredMedications = (availableMedications || []).filter(med => {
    if (!med || !med.name || !med.category) return false;

    const searchLower = medicationSearchTerm.toLowerCase();
    return med.name.toLowerCase().includes(searchLower) ||
           (med.genericName && med.genericName.toLowerCase().includes(searchLower)) ||
           med.category.toLowerCase().includes(searchLower);
  });

  // Add medication to prescription
  const addMedication = (medication) => {
    const newMedication = {
      id: medication.id, // Use the actual medication database ID
      name: medication.name,
      genericName: medication.genericName,
      category: medication.category,
      strength: medication.strength,
      dosageForm: medication.dosageForm,
      manufacturer: medication.manufacturer,
      currentStock: medication.currentStock,
      dosage: medication.dosages[0], // Default to first dosage
      frequency: medication.frequencies[0], // Default to first frequency
      quantity: getDefaultQuantity(medication.dosageForm), // Default quantity based on dosage form
      instructions: medication.commonInstructions,
      availableDosages: medication.dosages,
      availableFrequencies: medication.frequencies
    };
    setSelectedMedications([...selectedMedications, newMedication]);
    setMedicationSearchTerm(''); // Clear search after adding
  };

  // Remove medication from prescription
  const removeMedication = (id) => {
    setSelectedMedications(selectedMedications.filter(med => med.id !== id));
  };

  // Enhanced real-time field validation
  const validateField = (field, value, medication = null) => {
    switch (field) {
      case 'quantity': {
        if (!value || value.trim() === '') return 'Quantity is required';
        const quantity = parseFloat(value);
        if (isNaN(quantity)) return 'Quantity must be a number';
        if (quantity <= 0) return 'Quantity must be greater than 0';
        if (quantity > 1000) return 'Quantity exceeds maximum limit (1000)';

        // Check stock availability
        if (medication && medication.currentStock && quantity > medication.currentStock) {
          return `Only ${medication.currentStock} available in stock`;
        }

        // Enhanced validation for different dosage forms
        if (medication && medication.dosageForm) {
          const dosageForm = medication.dosageForm.toLowerCase();
          const decimals = (quantity.toString().split('.')[1] || '').length;

          if (['tablet', 'capsule', 'suppository', 'patch'].includes(dosageForm)) {
            if (quantity % 0.5 !== 0) {
              return 'Quantity for tablets/capsules must be in increments of 0.5';
            }
          } else if (['injection', 'vial', 'ampoule'].includes(dosageForm)) {
            if (quantity % 1 !== 0) {
              return 'Quantity for injections must be whole numbers';
            }
          } else if (['syrup', 'suspension', 'solution'].includes(dosageForm)) {
            if (decimals > 1) {
              return 'Liquid quantities should not exceed 1 decimal place';
            }
            if (quantity < 5) {
              return 'Minimum liquid quantity is 5ml';
            }
          }
        }

        return null;
      }

      case 'dosage': {
        if (!value || value.trim() === '') return 'Dosage is required';

        // Enhanced dosage pattern with more units
        const dosagePattern = /^\d+(\.\d{1,3})?\s*(mg|g|ml|mcg|μg|iu|unit|units?|tab|tabs?|cap|caps?|drop|drops?|puff|puffs?|spray|sprays?|patch|patches?)$/i;
        if (!dosagePattern.test(value.trim())) {
          return 'Invalid format (e.g., 500mg, 1.5g, 10ml, 2tabs, 1puff)';
        }

        // Check for reasonable dosage ranges
        const numericValue = parseFloat(value.match(/^\d+(\.\d+)?/)[0]);
        const unit = value.replace(/[\d.\s]/g, '').toLowerCase();

        const dosageLimits = {
          'mg': { min: 0.1, max: 5000 },
          'mcg': { min: 0.1, max: 10000 },
          'μg': { min: 0.1, max: 10000 },
          'g': { min: 0.01, max: 50 },
          'ml': { min: 0.1, max: 1000 },
          'iu': { min: 1, max: 100000 },
          'unit': { min: 1, max: 1000 },
          'units': { min: 1, max: 1000 },
          'tab': { min: 0.25, max: 20 },
          'tabs': { min: 0.25, max: 20 },
          'cap': { min: 0.5, max: 20 },
          'caps': { min: 0.5, max: 20 },
          'drop': { min: 1, max: 50 },
          'drops': { min: 1, max: 50 },
          'puff': { min: 1, max: 20 },
          'puffs': { min: 1, max: 20 }
        };

        const limits = dosageLimits[unit];
        if (limits && (numericValue < limits.min || numericValue > limits.max)) {
          return `Dosage should be between ${limits.min} and ${limits.max} ${unit}`;
        }

        return null;
      }

      case 'instructions': {
        if (value && value.length > 500) return 'Instructions too long (max 500 characters)';
        if (value && value.trim().length > 0 && value.trim().length < 3) {
          return 'Instructions too short (min 3 characters)';
        }

        // Enhanced safety checks
        if (value) {
          const dangerousWords = [
            'overdose', 'double dose', 'triple dose', 'quadruple dose',
            'as much as possible', 'unlimited', 'no limit', 'maximum dose',
            'crush and inject', 'inject', 'snort', 'abuse',
            'all at once', 'entire bottle', 'whole pack'
          ];

          if (dangerousWords.some(word => value.toLowerCase().includes(word))) {
            return 'Instructions contain potentially unsafe language';
          }

          // Check for contradictory instructions
          const contradictoryPairs = [
            ['with food', 'on empty stomach'],
            ['before meals', 'after meals'],
            ['morning', 'bedtime'],
            ['with milk', 'avoid dairy']
          ];

          const lowerInstructions = value.toLowerCase();
          for (const [term1, term2] of contradictoryPairs) {
            if (lowerInstructions.includes(term1) && lowerInstructions.includes(term2)) {
              return `Contradictory terms: '${term1}' and '${term2}'`;
            }
          }
        }

        return null;
      }

      case 'frequency': {
        if (!value || value.trim() === '') return 'Frequency is required';

        const validFrequencies = [
          'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)',
          'Four times daily (QDS)', 'As needed (PRN)', 'Before meals',
          'After meals', 'At bedtime', 'As per sliding scale'
        ];

        if (!validFrequencies.includes(value)) {
          return 'Please select a valid frequency';
        }
        return null;
      }

      default:
        return null;
    }
  };

  // Update medication details with real-time validation
  const updateMedication = (id, field, value) => {
    // Update the medication
    const updatedMedications = selectedMedications.map(med =>
      med.id === id ? { ...med, [field]: value } : med
    );
    setSelectedMedications(updatedMedications);

    // Real-time validation for specific fields
    const medication = selectedMedications.find(med => med.id === id);
    const medicationIndex = selectedMedications.findIndex(med => med.id === id);

    if (['quantity', 'dosage', 'instructions'].includes(field)) {
      const fieldError = validateField(field, value, medication);

      if (fieldError) {
        setValidationErrors(prev => ({
          ...prev,
          [`medication_${medicationIndex}`]: {
            ...prev[`medication_${medicationIndex}`],
            [field]: fieldError
          }
        }));
      } else {
        // Clear the specific field error
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors[`medication_${medicationIndex}`]) {
            delete newErrors[`medication_${medicationIndex}`][field];
            if (Object.keys(newErrors[`medication_${medicationIndex}`]).length === 0) {
              delete newErrors[`medication_${medicationIndex}`];
            }
          }
          return newErrors;
        });
      }
    }

    // Clear general validation errors for this medication
    clearFieldError(`medication_${medicationIndex}`);
  };

  // Reset form when modal opens and fetch medications
  useEffect(() => {
    if (isOpen) {
      setPatientSearchTerm('');
      setSelectedPatient(null);
      setSelectedMedications([]);
      setMedicationSearchTerm('');
      setPrescriptionData({
        startDate: new Date().toISOString().split('T')[0]
      });
      setIsSubmitting(false);
      setValidationErrors({});
      setMedicationsFetched(false); // Reset fetch state
    }
  }, [isOpen]);

  // Separate effect for fetching medications when modal opens
  useEffect(() => {
    if (isOpen && !medicationsFetched && !medicationsLoading) {
      // Call fetchMedications directly to avoid dependency issues
      const fetchData = async () => {
        // Prevent multiple simultaneous requests
        if (medicationsLoading || medicationsFetched) {
          return;
        }

        try {
          setMedicationsLoading(true);
          setMedicationsError(null);

          const jwtToken = localStorage.getItem('jwtToken');
          if (!jwtToken) {
            setAvailableMedications([]);
            setMedicationsError('Authentication required. Please log in again.');
            notifications.error('Authentication Error', 'No valid session found. Please log in again.');
            setMedicationsFetched(true);
            return;
          }

          // Fetch from pharmacy medications API endpoint
          const response = await axios.get('/api/pharmacy/medications/getAll', {
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });

          // Handle successful response
          if (response.data && Array.isArray(response.data)) {
            // Direct array response
            const transformedMedications = response.data.map(med => ({
              id: med.id, // Use the actual database ID
              name: med.drugName || med.name || med.medicationName,
              genericName: med.genericName,
              category: med.category || med.drugCategory,
              strength: med.strength || med.dosage,
              dosageForm: med.dosageForm || med.form,
              manufacturer: med.manufacturer || 'Unknown',
              currentStock: med.currentStock || med.quantityInStock || 0,
              unitCost: med.unitCost || med.price || 0,
              expiryDate: med.expiryDate || med.expiry,
              isActive: med.isActive !== false, // Default to true if not specified
              dosages: generateDosageOptions(med.strength || med.dosage, med.dosageForm || med.form),
              frequencies: getStandardFrequencies(med.category || med.drugCategory),
              commonInstructions: getInstructionsForCategory(med.category || med.drugCategory, med.genericName)
            }));

            // Filter only active medications with stock
            const activeMedications = transformedMedications.filter(med =>
              med.isActive && med.currentStock > 0 && med.name
            );

            if (activeMedications.length > 0) {
              setAvailableMedications(activeMedications);
            } else {
              setAvailableMedications([]);
              setMedicationsError('No active medications with stock found in pharmacy system.');
              notifications.warning('No Medications Available', 'No active medications with stock found in the pharmacy system.');
            }
          } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
            // Paginated response
            const transformedMedications = response.data.content.map(med => ({
              id: med.id, // Use the actual database ID
              name: med.drugName || med.name || med.medicationName,
              genericName: med.genericName,
              category: med.category || med.drugCategory,
              strength: med.strength || med.dosage,
              dosageForm: med.dosageForm || med.form,
              manufacturer: med.manufacturer || 'Unknown',
              currentStock: med.currentStock || med.quantityInStock || 0,
              unitCost: med.unitCost || med.price || 0,
              expiryDate: med.expiryDate || med.expiry,
              isActive: med.isActive !== false,
              dosages: generateDosageOptions(med.strength || med.dosage, med.dosageForm || med.form),
              frequencies: getStandardFrequencies(med.category || med.drugCategory),
              commonInstructions: getInstructionsForCategory(med.category || med.drugCategory, med.genericName)
            }));

            const activeMedications = transformedMedications.filter(med =>
              med.isActive && med.currentStock > 0 && med.name
            );

            if (activeMedications.length > 0) {
              setAvailableMedications(activeMedications);
            } else {
              setAvailableMedications([]);
              setMedicationsError('No active medications with stock found in pharmacy system.');
              notifications.warning('No Medications Available', 'No active medications with stock found in the pharmacy system.');
            }
          } else {
            setAvailableMedications([]);
            setMedicationsError('Unexpected response format from pharmacy API.');
            notifications.error('API Response Error', 'Received unexpected data format from pharmacy medications API.');
          }

        } catch (err) {
          console.error('Error fetching medications from pharmacy API:', err);

          // Set error state instead of fallback
          setAvailableMedications([]);

          let errorMessage = 'Failed to fetch medications from pharmacy API.';

          if (err.response?.status === 401) {
            errorMessage = 'Session expired. Please log in again.';
          } else if (err.response?.status === 403) {
            errorMessage = 'Access denied to pharmacy medications.';
          } else if (err.response?.status === 404) {
            errorMessage = 'Pharmacy medications endpoint not found.';
          } else if (err.response?.status === 500) {
            errorMessage = 'Pharmacy server error occurred.';
          } else if (err.code === 'ECONNABORTED') {
            errorMessage = 'Pharmacy API request timeout.';
          } else if (!err.response) {
            errorMessage = 'Network error accessing pharmacy API.';
          }

          setMedicationsError(errorMessage);

          // Show error notification
          notifications.error('Medications Loading Failed', errorMessage);

        } finally {
          setMedicationsLoading(false);
          setMedicationsFetched(true);
        }
      };

      fetchData();
    }
  }, [isOpen, medicationsFetched, medicationsLoading, notifications]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous validation errors
    clearValidationErrors();

    // Perform comprehensive validation
    const isValid = validateForm();

    if (!isValid) {
      // Show validation errors
      const errorCount = Object.keys(validationErrors).length;
      notifications.error(
        'Validation Failed',
        `Please fix ${errorCount} validation error(s) before submitting`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create single grouped prescription with multiple medications (API format)
      const groupedPrescription = {
        // Patient and prescription metadata
        patientNationalId: selectedPatient.patientNationalId,
        admissionId: selectedPatient.admissionId,
        prescribedBy: "Ward Doctor", // Use string instead of doctor entity
        startDate: prescriptionData.startDate,
        endDate: null, // Optional - can be set later
        prescriptionNotes: `Ward prescription for ${selectedMedications.length} medication(s) - Patient: ${selectedPatient.patientName}`,

        // Convert selected medications to prescriptionItems format
        medications: selectedMedications.map(medication => ({
          medicationId: medication.id, // Use medication entity ID (required relationship field)
          dose: medication.dosage,
          frequency: medication.frequency,
          quantity: parseInt(medication.quantity) || 1,
          quantityUnit: getQuantityUnit(medication.dosageForm),
          instructions: medication.instructions || '',
          route: medication.route || 'Oral',
          isUrgent: medication.isUrgent || false,
          notes: medication.notes || ''
        }))
      };

      // Submit single grouped prescription
      if (onPrescriptionAdded) {
        await onPrescriptionAdded(groupedPrescription);
      }

      // Show success notification
      notifications.success(
        'Grouped Prescription Created Successfully',
        `Single prescription with ${selectedMedications.length} medication(s) created for ${selectedPatient.patientName}`,
        {
          action: {
            label: 'View Prescription',
            onClick: () => console.log('Navigate to prescriptions list')
          }
        }
      );

      // Reset form and close modal
      handleClose();

    } catch (error) {
      console.error('Error creating grouped prescription:', error);
      notifications.error(
        'Failed to Create Grouped Prescription',
        error.message || 'An unexpected error occurred while creating the prescription with multiple medications'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPatientSearchTerm('');
      setSelectedPatient(null);
      setSelectedMedications([]);
      setMedicationSearchTerm('');
      setPrescriptionData({
        startDate: new Date().toISOString().split('T')[0]
      });
      setIsSubmitting(false);
      setValidationErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-100 relative">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Pill size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Create Prescription</h2>
              <div className="flex items-center space-x-2 text-blue-100">
                <User size={16} />
                <span className="text-lg">
                  {selectedPatient ? `Patient: ${selectedPatient.patientName}` : 'Search and Select Patient'}
                </span>
              </div>
              {selectedPatient && (
                <div className="text-blue-200 text-sm space-y-1">
                  <div>National ID: {selectedPatient.patientNationalId}</div>
                  <div>Ward: {selectedPatient.wardName} - Bed {selectedPatient.bedNumber}</div>
                  <div>Admitted: {new Date(selectedPatient.admissionDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
          <form onSubmit={handleSubmit} className="p-8 space-y-8 pb-24">

            {/* Validation Errors Display */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2 text-red-800 mb-3">
                  <AlertTriangle size={20} />
                  <span className="font-semibold">Please fix the following errors:</span>
                </div>
                <div className="space-y-2">
                  {validationErrors.patient && (
                    <div className="text-red-700 text-sm">• {validationErrors.patient}</div>
                  )}
                  {validationErrors.medications && (
                    <div className="text-red-700 text-sm">• {validationErrors.medications}</div>
                  )}
                  {validationErrors.duplicates && (
                    <div className="text-red-700 text-sm">• {validationErrors.duplicates}</div>
                  )}
                  {Object.keys(validationErrors).filter(key => key.startsWith('medication_')).length > 0 && (
                    <div className="text-red-700 text-sm">• Some medications have validation errors (see below)</div>
                  )}
                </div>
              </div>
            )}
            {/* Step 1: Patient Search and Selection */}
            <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border ${validationErrors.patient ? 'border-red-300 bg-red-50' : 'border-blue-100'}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                <User size={20} className="mr-3 text-blue-600" />
                Step 1: Search and Select Patient
                {validationErrors.patient && (
                  <span className="ml-2 text-red-600">
                    <AlertCircle size={16} />
                  </span>
                )}
              </h3>
              {validationErrors.patient && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="text-red-700 text-sm flex items-center">
                    <AlertCircle size={14} className="mr-2" />
                    {validationErrors.patient}
                  </div>
                </div>
              )}

              {!selectedPatient ? (
                <div className="space-y-4">
                  {/* Patient Search */}
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search patients by name, ID, or ward..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  {/* Patient Results */}
                  {patientSearchTerm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <button
                            key={patient.admissionId}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(patient);
                              clearFieldError('patient');
                            }}
                            className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-white transition-all duration-200 text-left"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{patient.patientName}</div>
                                <div className="text-sm text-gray-500">ID: {patient.patientNationalId}</div>
                                <div className="text-sm text-gray-500">
                                  {patient.wardName} - Bed {patient.bedNumber}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                          No patients found matching your search
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show message when no active patients available */}
                  {!patientSearchTerm && activePatients.length === 0 && (
                    <div className="text-center py-8">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <div className="flex items-center justify-center mb-4">
                          <AlertCircle className="text-yellow-600" size={48} />
                        </div>
                        <h4 className="text-lg font-semibold text-yellow-800 mb-2">No Active Patients Available</h4>
                        <p className="text-yellow-700 mb-4">
                          There are currently no active patients available for prescriptions.
                          Only patients who are currently admitted with an active status can receive prescriptions.
                        </p>
                        <div className="text-sm text-yellow-600">
                          <p className="font-medium mb-2">A patient must have:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Active admission status</li>
                            <li>Assigned ward and bed</li>
                            <li>No discharge date</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show all patients when no search */}
                  {!patientSearchTerm && activePatients.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Available active patients:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                        {activePatients.map((patient) => (
                          <button
                            key={patient.admissionId}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(patient);
                              clearFieldError('patient');
                            }}
                            className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-white transition-all duration-200 text-left"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{patient.patientName}</div>
                                <div className="text-sm text-gray-500">ID: {patient.patientNationalId}</div>
                                <div className="text-sm text-gray-500">
                                  {patient.wardName} - Bed {patient.bedNumber}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <User size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{selectedPatient.patientName}</div>
                      <div className="text-sm text-gray-500">ID: {selectedPatient.patientNationalId}</div>
                      <div className="text-sm text-gray-500">
                        {selectedPatient.wardName} - Bed {selectedPatient.bedNumber}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Medication Search and Selection */}
            <div className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border ${validationErrors.medications ? 'border-red-300 bg-red-50' : 'border-green-100'} ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                <Pill size={20} className="mr-3 text-green-600" />
                Step 2: Search and Add Medications
                {validationErrors.medications && (
                  <span className="ml-2 text-red-600">
                    <AlertCircle size={16} />
                  </span>
                )}
              </h3>
              {validationErrors.medications && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="text-red-700 text-sm flex items-center">
                    <AlertCircle size={14} className="mr-2" />
                    {validationErrors.medications}
                  </div>
                </div>
              )}

              {/* Medication Search */}
              <div className="space-y-4">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medications by name, generic name, or category..."
                    value={medicationSearchTerm}
                    onChange={(e) => setMedicationSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    disabled={!selectedPatient || medicationsLoading}
                  />
                  {medicationsLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    </div>
                  )}
                </div>

                {/* Medication Search Results */}
                {medicationSearchTerm && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                    {filteredMedications.length > 0 ? (
                      filteredMedications.map((medication) => (
                        <button
                          key={medication.id}
                          type="button"
                          onClick={() => addMedication(medication)}
                          className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-white transition-all duration-200 text-left min-h-[140px] flex flex-col justify-between bg-white shadow-sm"
                          disabled={selectedMedications.some(med => med.id === medication.id)}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2 flex-1">
                                <Pill size={16} className="text-green-600 flex-shrink-0" />
                                <span className="font-medium text-gray-900 text-sm leading-tight">{medication.name}</span>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                                Stock: {medication.currentStock}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">{medication.category}</div>
                            <div className="text-xs text-gray-400 leading-relaxed">
                              {medication.genericName && (
                                <div>Generic: {medication.genericName}</div>
                              )}
                              <div>{medication.strength} {medication.dosageForm}</div>
                              <div>{medication.manufacturer}</div>
                            </div>
                          </div>
                          {selectedMedications.some(med => med.id === medication.id) && (
                            <div className="text-xs text-green-600 font-medium mt-2 flex items-center">
                              <span className="bg-green-100 px-2 py-1 rounded-full">✓ Added</span>
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        <Pill size={48} className="mx-auto text-gray-300 mb-4" />
                        <p>No medications found matching your search</p>
                        <p className="text-sm text-gray-400 mt-1">Try searching with different keywords</p>
                      </div>
                    )}
                  </div>
                )}


                {/* Error state */}
                {medicationsError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-red-800 mb-2">
                      <AlertCircle size={16} />
                      <span className="font-medium">Error loading medications</span>
                    </div>
                    <p className="text-red-700 text-sm mb-3">{medicationsError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setMedicationsFetched(false);
                        setMedicationsError(null);
                        fetchMedications();
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      disabled={medicationsLoading}
                    >
                      {medicationsLoading ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                )}

                {/* Available medications when no search */}
                {!medicationSearchTerm && !medicationsError && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Available medications: {(availableMedications || []).length} items
                      {medicationsLoading && ' (Loading...)'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                      {(availableMedications || []).map((medication) => (
                        <button
                          key={medication.id}
                          type="button"
                          onClick={() => addMedication(medication)}
                          className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-white transition-all duration-200 text-left min-h-[140px] flex flex-col justify-between bg-white shadow-sm"
                          disabled={selectedMedications.some(med => med.id === medication.id)}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2 flex-1">
                                <Pill size={16} className="text-green-600 flex-shrink-0" />
                                <span className="font-medium text-gray-900 text-sm leading-tight">{medication.name}</span>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                                Stock: {medication.currentStock}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">{medication.category}</div>
                            <div className="text-xs text-gray-400 leading-relaxed">
                              {medication.genericName && (
                                <div>Generic: {medication.genericName}</div>
                              )}
                              <div>{medication.strength} {medication.dosageForm}</div>
                              <div>{medication.manufacturer}</div>
                            </div>
                          </div>
                          {selectedMedications.some(med => med.id === medication.id) && (
                            <div className="text-xs text-green-600 font-medium mt-2 flex items-center">
                              <span className="bg-green-100 px-2 py-1 rounded-full">✓ Added</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Selected Medications with Dosage Configuration */}
            {selectedMedications.length > 0 && (
              <div className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border ${validationErrors.duplicates || Object.keys(validationErrors).some(key => key.startsWith('medication_')) ? 'border-red-300 bg-red-50' : 'border-amber-100'}`}>
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <FileText size={20} className="mr-3 text-amber-600" />
                  Step 3: Configure Selected Medications ({selectedMedications.length})
                  {(validationErrors.duplicates || Object.keys(validationErrors).some(key => key.startsWith('medication_'))) && (
                    <span className="ml-2 text-red-600">
                      <AlertCircle size={16} />
                    </span>
                  )}
                </h3>
                {validationErrors.duplicates && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="text-red-700 text-sm flex items-center">
                      <AlertCircle size={14} className="mr-2" />
                      {validationErrors.duplicates}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                {selectedMedications.map((medication, index) => {
                  const medicationErrors = validationErrors[`medication_${index}`] || {};
                  const hasErrors = Object.keys(medicationErrors).length > 0;

                  return (
                    <div key={medication.id} className={`bg-white rounded-xl p-4 border ${hasErrors ? 'border-red-300 bg-red-50' : 'border-amber-200'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Pill size={20} className="text-amber-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">{medication.name}</h4>
                            <p className="text-sm text-gray-500">
                              {medication.category} • {medication.strength} {medication.dosageForm}
                            </p>
                            {medication.genericName && (
                              <p className="text-xs text-gray-400">Generic: {medication.genericName}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              Stock: {medication.currentStock} • {medication.manufacturer}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(medication.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Minus size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Dosage *
                          </label>
                          <select
                            value={medication.dosage}
                            onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                            className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 transition-all duration-200 ${medicationErrors.dosage ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'}`}
                          >
                            {medication.availableDosages.map((dosage) => (
                              <option key={dosage} value={dosage}>{dosage}</option>
                            ))}
                          </select>
                          {medicationErrors.dosage && (
                            <div className="mt-1 text-red-600 text-xs flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {medicationErrors.dosage}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Frequency *
                          </label>
                          <select
                            value={medication.frequency}
                            onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                            className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 transition-all duration-200 ${medicationErrors.frequency ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'}`}
                          >
                            {medication.availableFrequencies.map((frequency) => (
                              <option key={frequency} value={frequency}>{frequency}</option>
                            ))}
                          </select>
                          {medicationErrors.frequency && (
                            <div className="mt-1 text-red-600 text-xs flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {medicationErrors.frequency}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quantity to Issue *
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              value={medication.quantity}
                              onChange={(e) => updateMedication(medication.id, 'quantity', e.target.value)}
                              className={`flex-1 px-3 py-2 border-2 rounded-lg focus:ring-2 transition-all duration-200 ${medicationErrors.quantity ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'}`}
                              placeholder="Enter quantity"
                            />
                            <span className="text-sm text-gray-500 min-w-[60px]">
                              {getQuantityUnit(medication.dosageForm)}
                            </span>
                          </div>
                          {medicationErrors.quantity && (
                            <div className="mt-1 text-red-600 text-xs flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {medicationErrors.quantity}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Instructions
                        </label>
                        <textarea
                          rows="2"
                          value={medication.instructions}
                          onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                          className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 transition-all duration-200 resize-none ${medicationErrors.instructions ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'}`}
                          placeholder="Special instructions for this medication..."
                          maxLength="500"
                        />
                        {medicationErrors.instructions && (
                          <div className="mt-1 text-red-600 text-xs flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            {medicationErrors.instructions}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {medication.instructions ? medication.instructions.length : 0}/500 characters
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}


          </form>
        </div>

        {/* Enhanced Footer - Fixed at bottom */}
        <div className="bg-white border-t border-gray-200 p-6 absolute bottom-0 left-0 right-0 shadow-lg z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              {Object.keys(validationErrors).length > 0 ? (
                <>
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-red-600 font-medium">
                    {Object.keys(validationErrors).length} validation error(s) - Please fix before submitting
                  </span>
                </>
              ) : !selectedPatient ? (
                <>
                  <AlertCircle size={16} className="text-gray-500" />
                  <span className="text-gray-500">Please select a patient to continue</span>
                </>
              ) : selectedMedications.length === 0 ? (
                <>
                  <AlertCircle size={16} className="text-gray-500" />
                  <span className="text-gray-500">Please add at least one medication</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-green-600 font-medium">
                    Ready to create {selectedMedications.length} prescription(s)
                  </span>
                </>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || isValidating || !selectedPatient || selectedMedications.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Prescriptions...</span>
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    <span>Create Prescription{selectedMedications.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;
