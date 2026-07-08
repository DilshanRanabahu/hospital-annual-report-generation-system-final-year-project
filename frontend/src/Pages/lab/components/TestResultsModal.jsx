import React, { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import axios from 'axios';

const TestResultsModal = ({ isOpen, onClose, labRequest, showToast }) => {
  const [results, setResults] = useState({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  if (!isOpen || !labRequest) return null;

  // Validation rules for different test types
  const validationRules = {
    'Complete Blood Count': {
      wbc: { min: 0, max: 50, required: true, label: 'White Blood Cells' },
      rbc: { min: 0, max: 10, required: true, label: 'Red Blood Cells' },
      hemoglobin: { min: 0, max: 25, required: true, label: 'Hemoglobin' },
      platelets: { min: 0, max: 1000, required: true, label: 'Platelets' }
    },
    'Blood Glucose': {
      glucose: { min: 20, max: 600, required: true, label: 'Glucose Level' },
      testType: { required: true, label: 'Test Type' }
    },
    'Urine Analysis': {
      protein: { required: true, label: 'Protein' },
      urineGlucose: { required: true, label: 'Glucose' },
      specificGravity: { min: 1.000, max: 1.040, required: true, label: 'Specific Gravity' },
      ph: { min: 4.0, max: 9.0, required: true, label: 'pH' }
    },
    'Cholesterol Level': {
      totalCholesterol: { min: 50, max: 500, required: true, label: 'Total Cholesterol' },
      hdlCholesterol: { min: 10, max: 150, required: true, label: 'HDL Cholesterol' },
      ldlCholesterol: { min: 20, max: 400, required: true, label: 'LDL Cholesterol' },
      triglycerides: { min: 30, max: 1000, required: true, label: 'Triglycerides' }
    }
  };

  // Validate a specific field
  const validateField = (testName, field, value) => {
    const rules = validationRules[testName];
    if (!rules || !rules[field]) return '';

    const rule = rules[field];
    
    // Required field validation
    if (rule.required && (!value || value === '')) {
      return `${rule.label} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || value === '') return '';

    // Numeric range validation
    if (typeof rule.min === 'number' && parseFloat(value) < rule.min) {
      return `${rule.label} must be at least ${rule.min}`;
    }
    
    if (typeof rule.max === 'number' && parseFloat(value) > rule.max) {
      return `${rule.label} must not exceed ${rule.max}`;
    }

    return '';
  };

  // Validate all fields for a test
  const validateTest = (testName) => {
    const testResults = results[testName] || {};
    const rules = validationRules[testName];
    const errors = {};

    if (rules) {
      Object.keys(rules).forEach(field => {
        const error = validateField(testName, field, testResults[field]);
        if (error) {
          errors[field] = error;
        }
      });
    }

    return errors;
  };

  // Get field error
  const getFieldError = (testName, field) => {
    return validationErrors[testName]?.[field] || '';
  };

  // Check if field has error
  const hasFieldError = (testName, field) => {
    return !!getFieldError(testName, field);
  };

  // Check if form is valid
  const isFormValid = () => {
    const tests = labRequest.tests || [{ testName: labRequest.testType }];
    
    for (const test of tests) {
      const testName = test.testName;
      const errors = validateTest(testName);
      if (Object.keys(errors).length > 0) {
        return false;
      }
    }
    
    return true;
  };

  const handleInputChange = (testName, field, value) => {
    // Update the results
    setResults(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: value
      }
    }));

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: true
      }
    }));

    // Validate the field and update errors
    const error = validateField(testName, field, value);
    setValidationErrors(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: error
      }
    }));
  };

  const handleFieldBlur = (testName, field) => {
    setTouched(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: true
      }
    }));

    const value = results[testName]?.[field];
    const error = validateField(testName, field, value);
    setValidationErrors(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: error
      }
    }));
  };

  const isFieldTouched = (testName, field) => {
    return touched[testName]?.[field] || false;
  };

  const handleClose = () => {
    // Reset all form state when closing
    setResults({});
    setNotes('');
    setValidationErrors({});
    setTouched({});
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (!jwtToken) {
        if (showToast) showToast('Authentication required', 'error');
        return;
      }

      // Validate all fields first
      const tests = labRequest.tests || [{ testName: labRequest.testType }];
      let hasValidationErrors = false;
      const allErrors = {};

      tests.forEach(test => {
        const testName = test.testName;
        const errors = validateTest(testName);
        if (Object.keys(errors).length > 0) {
          allErrors[testName] = errors;
          hasValidationErrors = true;
        }
      });

      if (hasValidationErrors) {
        setValidationErrors(allErrors);
        if (showToast) showToast('Please fix validation errors before submitting', 'error');
        return;
      }

      // Filter out empty results
      const filteredResults = {};
      Object.keys(results).forEach(testName => {
        const testResults = results[testName];
        if (testResults && Object.keys(testResults).length > 0) {
          // Filter out empty values
          const cleanResults = {};
          Object.keys(testResults).forEach(key => {
            if (testResults[key] !== '' && testResults[key] !== null && testResults[key] !== undefined) {
              cleanResults[key] = testResults[key];
            }
          });
          if (Object.keys(cleanResults).length > 0) {
            filteredResults[testName] = cleanResults;
          }
        }
      });

      if (Object.keys(filteredResults).length === 0) {
        if (showToast) showToast('Please enter at least one test result', 'error');
        return;
      }

      const submitData = {
        requestId: labRequest.requestId,
        tests: labRequest.tests || [{ testName: labRequest.testType }],
        results: filteredResults,
        notes: notes.trim(),
        completedAt: new Date().toISOString(),
        completedBy: 'Lab Staff'
      };

      console.log('Submitting test results:', submitData);

      // Test 1: Simple endpoint
      const testResponse = await axios.get('/api/simple-test/hello');
      console.log('✅ Simple test response:', testResponse.data);

      // Test 2: Database connection
      const dbResponse = await axios.get('/api/debug/database-connection');
      console.log('✅ Database test response:', dbResponse.data);

      // Test 3: Lab request exists
      const labRequestResponse = await axios.get(`/api/debug/lab-request/${submitData.requestId}`);
      console.log('✅ Lab request test response:', labRequestResponse.data);

      // Test 4: Basic test result save (without specific test results)
      const basicTestResult = await axios.post(
        '/api/test-simple/save-basic',
        submitData
      );
      console.log('✅ Basic test result response:', basicTestResult.data);

      // Test 5: Simple test result endpoint (no database)
      const simpleTestResult = await axios.post(
        '/api/test-results-simple/test-save',
        submitData
      );
      console.log('✅ Simple test result response:', simpleTestResult.data);

      // Test 6: Full test result save WITHOUT Authorization (to test if JWT is the issue)
      console.log('🔍 Testing without JWT token first...');
      const responseNoAuth = await axios.post(
        '/api/test-results/save',
        submitData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Test result save WITHOUT JWT:', responseNoAuth.data);

      // Test 7: Full test result save WITH Authorization (original)
      console.log('🔍 JWT Token:', jwtToken ? 'exists' : 'missing');
      const response = await axios.post(
        '/api/test-results/save',
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        if (showToast) showToast('Test results saved successfully', 'success');
        // Reset form
        setResults({});
        setNotes('');
        setValidationErrors({});
        setTouched({});
        onClose();
      } else {
        if (showToast) showToast('Failed to save test results', 'error');
      }
    } catch (error) {
      console.error('Error submitting test results:', error);
      if (error.response?.status === 401) {
        if (showToast) showToast('Authentication failed', 'error');
      } else {
        if (showToast) showToast('Failed to save test results', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCompleteBloodCountInputs = (testName) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Complete Blood Count Results</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            White Blood Cells (WBC) <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 4.0-11.0 × 10³/μL)</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 7.5"
            value={results[testName]?.wbc || ''}
            onChange={(e) => handleInputChange(testName, 'wbc', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'wbc')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'wbc') && isFieldTouched(testName, 'wbc')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'wbc') && isFieldTouched(testName, 'wbc') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'wbc')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Red Blood Cells (RBC) <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 4.2-5.9 × 10⁶/μL)</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 4.8"
            value={results[testName]?.rbc || ''}
            onChange={(e) => handleInputChange(testName, 'rbc', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'rbc')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'rbc') && isFieldTouched(testName, 'rbc')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'rbc') && isFieldTouched(testName, 'rbc') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'rbc')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hemoglobin <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 12.0-15.5 g/dL)</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 13.2"
            value={results[testName]?.hemoglobin || ''}
            onChange={(e) => handleInputChange(testName, 'hemoglobin', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'hemoglobin')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'hemoglobin') && isFieldTouched(testName, 'hemoglobin')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'hemoglobin') && isFieldTouched(testName, 'hemoglobin') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'hemoglobin')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platelets <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 150-450 × 10³/μL)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 300"
            value={results[testName]?.platelets || ''}
            onChange={(e) => handleInputChange(testName, 'platelets', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'platelets')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'platelets') && isFieldTouched(testName, 'platelets')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'platelets') && isFieldTouched(testName, 'platelets') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'platelets')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderBloodGlucoseInputs = (testName) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Blood Glucose Results</h4>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Glucose Level <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 70-100 mg/dL fasting)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 95"
            value={results[testName]?.glucose || ''}
            onChange={(e) => handleInputChange(testName, 'glucose', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'glucose')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'glucose') && isFieldTouched(testName, 'glucose')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'glucose') && isFieldTouched(testName, 'glucose') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'glucose')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Type <span className="text-red-500">*</span>
          </label>
          <select
            value={results[testName]?.testType || ''}
            onChange={(e) => handleInputChange(testName, 'testType', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'testType')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'testType') && isFieldTouched(testName, 'testType')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select test type</option>
            <option value="fasting">Fasting Glucose</option>
            <option value="random">Random Glucose</option>
            <option value="postprandial">Post-prandial Glucose</option>
          </select>
          {hasFieldError(testName, 'testType') && isFieldTouched(testName, 'testType') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'testType')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderUrineAnalysisInputs = (testName) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Urine Analysis Results</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Protein <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: Negative/Trace)</span>
          </label>
          <select
            value={results[testName]?.protein || ''}
            onChange={(e) => handleInputChange(testName, 'protein', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'protein')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'protein') && isFieldTouched(testName, 'protein')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select Result</option>
            <option value="negative">Negative</option>
            <option value="trace">Trace</option>
            <option value="1+">1+</option>
            <option value="2+">2+</option>
            <option value="3+">3+</option>
            <option value="4+">4+</option>
          </select>
          {hasFieldError(testName, 'protein') && isFieldTouched(testName, 'protein') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'protein')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Glucose <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: Negative)</span>
          </label>
          <select
            value={results[testName]?.urineGlucose || ''}
            onChange={(e) => handleInputChange(testName, 'urineGlucose', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'urineGlucose')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'urineGlucose') && isFieldTouched(testName, 'urineGlucose')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select Result</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
          </select>
          {hasFieldError(testName, 'urineGlucose') && isFieldTouched(testName, 'urineGlucose') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'urineGlucose')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specific Gravity <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 1.003-1.030)</span>
          </label>
          <input
            type="number"
            step="0.001"
            placeholder="e.g., 1.020"
            value={results[testName]?.specificGravity || ''}
            onChange={(e) => handleInputChange(testName, 'specificGravity', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'specificGravity')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'specificGravity') && isFieldTouched(testName, 'specificGravity')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'specificGravity') && isFieldTouched(testName, 'specificGravity') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'specificGravity')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            pH <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: 4.6-8.0)</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 6.5"
            value={results[testName]?.ph || ''}
            onChange={(e) => handleInputChange(testName, 'ph', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'ph')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'ph') && isFieldTouched(testName, 'ph')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'ph') && isFieldTouched(testName, 'ph') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'ph')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderCholesterolInputs = (testName) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Cholesterol Level Results</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Cholesterol <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: &lt;200 mg/dL)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 180"
            value={results[testName]?.totalCholesterol || ''}
            onChange={(e) => handleInputChange(testName, 'totalCholesterol', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'totalCholesterol')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'totalCholesterol') && isFieldTouched(testName, 'totalCholesterol')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'totalCholesterol') && isFieldTouched(testName, 'totalCholesterol') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'totalCholesterol')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HDL Cholesterol <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: &gt;40 mg/dL)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 50"
            value={results[testName]?.hdlCholesterol || ''}
            onChange={(e) => handleInputChange(testName, 'hdlCholesterol', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'hdlCholesterol')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'hdlCholesterol') && isFieldTouched(testName, 'hdlCholesterol')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'hdlCholesterol') && isFieldTouched(testName, 'hdlCholesterol') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'hdlCholesterol')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LDL Cholesterol <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: &lt;100 mg/dL)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 110"
            value={results[testName]?.ldlCholesterol || ''}
            onChange={(e) => handleInputChange(testName, 'ldlCholesterol', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'ldlCholesterol')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'ldlCholesterol') && isFieldTouched(testName, 'ldlCholesterol')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'ldlCholesterol') && isFieldTouched(testName, 'ldlCholesterol') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'ldlCholesterol')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Triglycerides <span className="text-red-500">*</span>
            <span className="text-gray-500">(Normal: &lt;150 mg/dL)</span>
          </label>
          <input
            type="number"
            step="1"
            placeholder="e.g., 120"
            value={results[testName]?.triglycerides || ''}
            onChange={(e) => handleInputChange(testName, 'triglycerides', e.target.value)}
            onBlur={() => handleFieldBlur(testName, 'triglycerides')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              hasFieldError(testName, 'triglycerides') && isFieldTouched(testName, 'triglycerides')
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {hasFieldError(testName, 'triglycerides') && isFieldTouched(testName, 'triglycerides') && (
            <p className="text-red-500 text-xs mt-1">{getFieldError(testName, 'triglycerides')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTestInputs = () => {
    const tests = labRequest.tests || [{ testName: labRequest.testType }];
    
    return (
      <div className="space-y-8">
        {tests.map((test, index) => {
          const testName = test.testName;
          
          let testComponent;
          switch (testName) {
            case 'Complete Blood Count':
              testComponent = renderCompleteBloodCountInputs(testName);
              break;
            case 'Blood Glucose':
              testComponent = renderBloodGlucoseInputs(testName);
              break;
            case 'Urine Analysis':
              testComponent = renderUrineAnalysisInputs(testName);
              break;
            case 'Cholesterol Level':
              testComponent = renderCholesterolInputs(testName);
              break;
            default:
              testComponent = (
                <div className="text-center py-8">
                  <p className="text-gray-500">Test type "{testName}" not supported for result entry</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Supported tests: Complete Blood Count, Blood Glucose, Urine Analysis, Cholesterol Level
                  </p>
                </div>
              );
          }

          return (
            <div key={`${testName}-${index}`} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              {testComponent}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Enter Test Results</h3>
              <p className="text-sm text-gray-600">
                Patient: {labRequest.patientName} | Test: {labRequest.tests && labRequest.tests.length > 0 
                  ? labRequest.tests.map(test => test.testName).join(', ')
                  : labRequest.testType || 'Unknown Test'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Patient ID:</span>
                <span className="ml-2 text-gray-900">{labRequest.patientId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Ward:</span>
                <span className="ml-2 text-gray-900">{labRequest.wardName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Request Date:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(labRequest.requestDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Priority:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  labRequest.priority === 'URGENT' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {labRequest.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Legend */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center text-sm text-blue-800">
              <span className="font-medium">Validation Guide:</span>
              <span className="ml-2">Fields marked with</span>
              <span className="text-red-500 font-bold ml-1 mr-1">*</span>
              <span>are required. Values must be within the normal range shown in gray.</span>
            </div>
          </div>

          {/* Test Results Input */}
          {renderTestInputs()}

          {/* Additional Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Enter any additional observations or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Validation Summary */}
          {!isFormValid() && Object.keys(validationErrors).length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Please correct the following errors:</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(validationErrors).map(([testName, testErrors]) =>
                        Object.entries(testErrors).map(([field, error]) => (
                          <li key={`${testName}-${field}`}>{error}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid() || Object.values(results).every(testResults => !testResults || Object.keys(testResults).length === 0)}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving Results...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Results</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestResultsModal;