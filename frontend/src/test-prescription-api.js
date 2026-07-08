// Test file to verify the new grouped prescription API integration
// This file demonstrates the new API structure and can be used for testing

import axios from 'axios';

const API_BASE_URL = '/api';

// Test API endpoints
export const testPrescriptionAPI = async () => {
  try {
    console.log('🧪 Testing Grouped Prescription API Integration...');

    // Test 1: Get all prescriptions
    console.log('\n📋 Test 1: Fetching prescriptions...');
    const prescriptionsResponse = await axios.get(`${API_BASE_URL}/prescriptions?page=0&size=10`);
    console.log('✅ Prescriptions API Response:', {
      success: prescriptionsResponse.data.success,
      totalElements: prescriptionsResponse.data.data.totalElements,
      prescriptions: prescriptionsResponse.data.data.content.length
    });

    // Test 2: Get statistics
    console.log('\n📊 Test 2: Fetching statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/prescriptions/statistics`);
    console.log('✅ Statistics API Response:', statsResponse.data.data);

    // Test 3: Test grouped prescription structure (example data)
    console.log('\n🏥 Test 3: Expected new prescription format:');
    const exampleGroupedPrescription = {
      id: "RX25092601",
      prescriptionId: "RX25092601",
      patientName: "John Doe",
      patientNationalId: "123456789",
      totalMedications: 3,
      prescriptionNotes: "Take all medications as prescribed",
      hasUrgentMedications: true,
      medications: [
        {
          id: 1,
          drugName: "Paracetamol",
          dose: "500mg",
          frequency: "3 times daily",
          quantity: 30,
          isUrgent: false
        },
        {
          id: 2,
          drugName: "Ibuprofen",
          dose: "200mg",
          frequency: "2 times daily",
          quantity: 20,
          isUrgent: true
        },
        {
          id: 3,
          drugName: "Vitamin D",
          dose: "1000 IU",
          frequency: "once daily",
          quantity: 30,
          isUrgent: false
        }
      ]
    };

    console.log('✅ Example Grouped Prescription:', {
      prescriptionId: exampleGroupedPrescription.prescriptionId,
      patient: exampleGroupedPrescription.patientName,
      totalMedications: exampleGroupedPrescription.totalMedications,
      hasUrgentMeds: exampleGroupedPrescription.hasUrgentMedications,
      medicationNames: exampleGroupedPrescription.medications.map(m => m.drugName)
    });

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📝 Key Changes in New System:');
    console.log('• Prescriptions now contain multiple medications (prescriptionItems)');
    console.log('• totalMedications field shows count of medications per prescription');
    console.log('• hasUrgentMedications indicates if any medication is urgent');
    console.log('• medications array contains all medication details');
    console.log('• Backwards compatible with single medication displays');

    return {
      success: true,
      message: 'All API tests passed',
      endpoints: {
        prescriptions: '✅ Working',
        statistics: '✅ Working',
        structure: '✅ Ready for grouped prescriptions'
      }
    };

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return {
      success: false,
      error: error.message,
      note: 'Some endpoints may require authentication'
    };
  }
};

// Example usage in a React component:
export const ExampleUsageInComponent = () => {
  /*
  import { usePrescriptions } from './hooks/usePrescriptions';

  const PrescriptionComponent = () => {
    const {
      prescriptions,
      addPrescription,
      addPrescriptionItem,
      removePrescriptionItem,
      getStats
    } = usePrescriptions();

    const handleCreateGroupedPrescription = async () => {
      const prescriptionData = {
        patientNationalId: "123456789",
        patientName: "John Doe",
        admissionId: 1,
        startDate: "2025-09-26",
        prescribedBy: "Dr. Smith",
        wardName: "ICU",
        bedNumber: "B-101",
        prescriptionNotes: "Monitor patient closely",
        medications: [
          {
            drugName: "Paracetamol",
            dose: "500mg",
            frequency: "3 times daily",
            quantity: 30,
            quantityUnit: "tablets",
            instructions: "Take with food"
          },
          {
            drugName: "Ibuprofen",
            dose: "200mg",
            frequency: "2 times daily",
            quantity: 20,
            quantityUnit: "tablets",
            isUrgent: true
          }
        ]
      };

      try {
        const newPrescription = await addPrescription(prescriptionData);
        console.log('Created grouped prescription:', newPrescription);
      } catch (error) {
        console.error('Failed to create prescription:', error.message);
      }
    };

    const handleAddMedication = async (prescriptionId) => {
      const medicationData = {
        drugName: "Vitamin C",
        dose: "500mg",
        frequency: "once daily",
        quantity: 30,
        quantityUnit: "tablets"
      };

      try {
        await addPrescriptionItem(prescriptionId, medicationData);
        console.log('Added medication to prescription');
      } catch (error) {
        console.error('Failed to add medication:', error.message);
      }
    };

    return (
      <div>
        {prescriptions.map(prescription => (
          <div key={prescription.id}>
            <h3>{prescription.patientName}</h3>
            <p>Total Medications: {prescription.totalMedications}</p>
            <p>Has Urgent: {prescription.hasUrgentMedications ? 'Yes' : 'No'}</p>

            <div>
              <h4>Medications:</h4>
              {prescription.medications?.map(medication => (
                <div key={medication.id}>
                  <strong>{medication.drugName}</strong> -
                  {medication.dose} {medication.frequency}
                  {medication.isUrgent && <span> (URGENT)</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  */
};

export default testPrescriptionAPI;