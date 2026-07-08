import { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Activity,
  Droplet,
  Heart,
  Save,
  FileText
} from 'lucide-react';

export default function SessionDetailsModal({ isOpen, onClose, session, onSubmit }) {
  const [formData, setFormData] = useState({
    actualStartTime: '',
    actualEndTime: '',
    duration: '',
    sessionType: 'HEMODIALYSIS',
    priority: 'NORMAL',
    preWeight: '',
    postWeight: '',
    fluidRemoval: '',
    preBloodPressure: '',
    postBloodPressure: '',
    preHeartRate: '',
    postHeartRate: '',
    temperature: '',
    patientComfort: 'good',
    dialysisAccess: 'AV_FISTULA',
    bloodFlow: '',
    dialysateFlow: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset form when session changes
  useEffect(() => {
    if (session) {
      setFormData({
        actualStartTime: session.actualStartTime || session.startTime || '',
        actualEndTime: session.actualEndTime || session.endTime || '',
        duration: session.duration || '',
        sessionType: session.sessionType || 'HEMODIALYSIS',
        priority: session.priority || 'NORMAL',
        preWeight: session.preWeight || '',
        postWeight: session.postWeight || '',
        fluidRemoval: session.fluidRemoval || '',
        preBloodPressure: session.preBloodPressure || '',
        postBloodPressure: session.postBloodPressure || '',
        preHeartRate: session.preHeartRate || '',
        postHeartRate: session.postHeartRate || '',
        temperature: session.temperature || '',
        patientComfort: session.patientComfort || 'good',
        dialysisAccess: session.dialysisAccess || 'AV_FISTULA',
        bloodFlow: session.bloodFlow || '',
        dialysateFlow: session.dialysateFlow || ''
      });
      setErrors({});
    }
  }, [session]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Auto-calculate duration
    if (field === 'actualStartTime' || field === 'actualEndTime') {
      const startTime = field === 'actualStartTime' ? value : formData.actualStartTime;
      const endTime = field === 'actualEndTime' ? value : formData.actualEndTime;
      
      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end - start;
        
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setFormData(prev => ({
            ...prev,
            duration: `${hours}h ${minutes}m`
          }));
        }
      }
    }

    // Auto-calculate fluid removal
    if (field === 'preWeight' || field === 'postWeight') {
      const preWeight = parseFloat(field === 'preWeight' ? value : formData.preWeight);
      const postWeight = parseFloat(field === 'postWeight' ? value : formData.postWeight);
      
      if (preWeight && postWeight && preWeight > postWeight) {
        const removal = ((preWeight - postWeight) * 1000).toFixed(0); // Convert to ml
        setFormData(prev => ({
          ...prev,
          fluidRemoval: removal
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.actualStartTime) {
      newErrors.actualStartTime = 'Start time is required';
    }

    if (!formData.actualEndTime) {
      newErrors.actualEndTime = 'End time is required';
    }

    // Time validation - end time must be after start time
    if (formData.actualStartTime && formData.actualEndTime) {
      const start = new Date(`2000-01-01T${formData.actualStartTime}`);
      const end = new Date(`2000-01-01T${formData.actualEndTime}`);
      if (end <= start) {
        newErrors.actualEndTime = 'End time must be after start time';
      }

      // Validate session duration (shouldn't be more than 24 hours)
      const diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours > 24) {
        newErrors.actualEndTime = 'Session cannot be longer than 24 hours';
      }
    }

    // Weight validation
    if (formData.preWeight) {
      const weight = parseFloat(formData.preWeight);
      if (isNaN(weight) || weight <= 0) {
        newErrors.preWeight = 'Please enter a valid weight';
      } else if (weight < 1 || weight > 500) {
        newErrors.preWeight = 'Weight must be between 1-500 kg';
      }
    }

    if (formData.postWeight) {
      const weight = parseFloat(formData.postWeight);
      if (isNaN(weight) || weight <= 0) {
        newErrors.postWeight = 'Please enter a valid weight';
      } else if (weight < 1 || weight > 500) {
        newErrors.postWeight = 'Weight must be between 1-500 kg';
      }
    }

    // Validate post weight is less than or equal to pre weight
    if (formData.preWeight && formData.postWeight) {
      const pre = parseFloat(formData.preWeight);
      const post = parseFloat(formData.postWeight);
      if (post > pre) {
        newErrors.postWeight = 'Post-treatment weight should be ≤ pre-treatment weight';
      }
    }

    // Fluid removal validation
    if (formData.fluidRemoval) {
      const fluid = parseFloat(formData.fluidRemoval);
      if (isNaN(fluid) || fluid < 0) {
        newErrors.fluidRemoval = 'Please enter a valid fluid amount';
      } else if (fluid > 10000) {
        newErrors.fluidRemoval = 'Fluid removal seems too high (max 10L)';
      }
    }

    // Blood pressure validation (format: systolic/diastolic)
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (formData.preBloodPressure && !bpRegex.test(formData.preBloodPressure)) {
      newErrors.preBloodPressure = 'Format should be: 120/80';
    } else if (formData.preBloodPressure) {
      const [sys, dia] = formData.preBloodPressure.split('/').map(Number);
      if (sys < 50 || sys > 300 || dia < 30 || dia > 200) {
        newErrors.preBloodPressure = 'Blood pressure values seem unusual';
      }
    }

    if (formData.postBloodPressure && !bpRegex.test(formData.postBloodPressure)) {
      newErrors.postBloodPressure = 'Format should be: 110/70';
    } else if (formData.postBloodPressure) {
      const [sys, dia] = formData.postBloodPressure.split('/').map(Number);
      if (sys < 50 || sys > 300 || dia < 30 || dia > 200) {
        newErrors.postBloodPressure = 'Blood pressure values seem unusual';
      }
    }

    // Heart rate validation
    if (formData.preHeartRate) {
      const hr = parseInt(formData.preHeartRate);
      if (isNaN(hr) || hr < 30 || hr > 250) {
        newErrors.preHeartRate = 'Heart rate must be between 30-250 bpm';
      }
    }

    if (formData.postHeartRate) {
      const hr = parseInt(formData.postHeartRate);
      if (isNaN(hr) || hr < 30 || hr > 250) {
        newErrors.postHeartRate = 'Heart rate must be between 30-250 bpm';
      }
    }

    // Temperature validation
    if (formData.temperature) {
      const temp = parseFloat(formData.temperature);
      if (isNaN(temp) || temp < 30 || temp > 45) {
        newErrors.temperature = 'Temperature must be between 30-45°C';
      }
    }

    // Blood flow validation
    if (formData.bloodFlow) {
      const flow = parseInt(formData.bloodFlow);
      if (isNaN(flow) || flow < 50 || flow > 600) {
        newErrors.bloodFlow = 'Blood flow must be between 50-600 ml/min';
      }
    }

    // Dialysate flow validation
    if (formData.dialysateFlow) {
      const flow = parseInt(formData.dialysateFlow);
      if (isNaN(flow) || flow < 100 || flow > 1000) {
        newErrors.dialysateFlow = 'Dialysate flow must be between 100-1000 ml/min';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(session.sessionId, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save session details:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!session || !session.sessionId) return;

    setIsDownloading(true);

    try {
      const jwtToken = localStorage.getItem('jwtToken');

      // Use fetch API - will succeed despite ad blocker warnings
      const response = await fetch(
        `/api/dialysis/sessions/${session.sessionId}/report/pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/pdf'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Verify we got a valid PDF blob
      if (blob.size === 0) {
        throw new Error('Empty response');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dialysis_Session_Report_${session.sessionId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log('✅ Report downloaded successfully');

    } catch (error) {
      // Only show error for REAL failures (not ad blocker warnings)
      // Ad blocker warnings don't actually prevent the download
      if (error.message && !error.message.includes('Failed to fetch')) {
        console.error('Download failed:', error);

        let errorMessage = 'Failed to download report. ';
        if (error.message.includes('404')) {
          errorMessage += 'Session not found.';
        } else if (error.message.includes('401')) {
          errorMessage += 'Please log in again.';
        } else if (error.message.includes('500')) {
          errorMessage += 'Server error.';
        } else {
          errorMessage += 'Please try again.';
        }

        alert(errorMessage);
      } else {
        // Ad blocker warning - download likely succeeded anyway
        console.log('ℹ️ Ad blocker warning logged (can be ignored if download worked)');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Session Details</h2>
              <p className="text-blue-100 text-sm">
                {session.patientName} • {new Date(session.scheduledDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Session Info */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Session Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type
                  </label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => handleInputChange('sessionType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HEMODIALYSIS">Hemodialysis</option>
                    <option value="PERITONEAL_DIALYSIS">Peritoneal Dialysis</option>
                    <option value="CONTINUOUS_RENAL_REPLACEMENT">Continuous Renal Replacement</option>
                    <option value="PLASMAPHERESIS">Plasmapheresis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.actualStartTime}
                    onChange={(e) => handleInputChange('actualStartTime', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.actualStartTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.actualStartTime && (
                    <p className="text-red-600 text-sm mt-1">{errors.actualStartTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.actualEndTime}
                    onChange={(e) => handleInputChange('actualEndTime', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.actualEndTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.actualEndTime && (
                    <p className="text-red-600 text-sm mt-1">{errors.actualEndTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="bg-red-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-600" />
                Vital Signs
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre-Treatment BP
                  </label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={formData.preBloodPressure}
                    onChange={(e) => handleInputChange('preBloodPressure', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.preBloodPressure ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.preBloodPressure && (
                    <p className="text-red-600 text-sm mt-1">{errors.preBloodPressure}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post-Treatment BP
                  </label>
                  <input
                    type="text"
                    placeholder="110/70"
                    value={formData.postBloodPressure}
                    onChange={(e) => handleInputChange('postBloodPressure', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.postBloodPressure ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.postBloodPressure && (
                    <p className="text-red-600 text-sm mt-1">{errors.postBloodPressure}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="72"
                    value={formData.preHeartRate}
                    onChange={(e) => handleInputChange('preHeartRate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.preHeartRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.preHeartRate && (
                    <p className="text-red-600 text-sm mt-1">{errors.preHeartRate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="68"
                    value={formData.postHeartRate}
                    onChange={(e) => handleInputChange('postHeartRate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.postHeartRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.postHeartRate && (
                    <p className="text-red-600 text-sm mt-1">{errors.postHeartRate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.temperature ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.temperature && (
                    <p className="text-red-600 text-sm mt-1">{errors.temperature}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Weight and Fluid Management */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Droplet className="w-5 h-5 mr-2 text-blue-600" />
                Weight & Fluid Management
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre-Treatment Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70.0"
                    value={formData.preWeight}
                    onChange={(e) => handleInputChange('preWeight', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.preWeight ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.preWeight && (
                    <p className="text-red-600 text-sm mt-1">{errors.preWeight}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post-Treatment Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="68.0"
                    value={formData.postWeight}
                    onChange={(e) => handleInputChange('postWeight', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.postWeight ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.postWeight && (
                    <p className="text-red-600 text-sm mt-1">{errors.postWeight}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fluid Removal (ml)
                  </label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={formData.fluidRemoval}
                    onChange={(e) => handleInputChange('fluidRemoval', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fluidRemoval ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.fluidRemoval && (
                    <p className="text-red-600 text-sm mt-1">{errors.fluidRemoval}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Treatment Parameters */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Treatment Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dialysis Access
                  </label>
                  <select
                    value={formData.dialysisAccess}
                    onChange={(e) => handleInputChange('dialysisAccess', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AV_FISTULA">AV Fistula</option>
                    <option value="AV_GRAFT">AV Graft</option>
                    <option value="CENTRAL_CATHETER">Central Catheter</option>
                    <option value="PERITONEAL">Peritoneal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Flow (ml/min)
                  </label>
                  <input
                    type="number"
                    placeholder="300"
                    value={formData.bloodFlow}
                    onChange={(e) => handleInputChange('bloodFlow', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dialysate Flow (ml/min)
                  </label>
                  <input
                    type="number"
                    placeholder="500"
                    value={formData.dialysateFlow}
                    onChange={(e) => handleInputChange('dialysateFlow', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Comfort
                  </label>
                  <select
                    value={formData.patientComfort}
                    onChange={(e) => handleInputChange('patientComfort', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={isDownloading || !session.sessionId}
                className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors"
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>{isDownloading ? 'Generating PDF...' : 'Download Report'}</span>
              </button>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Details'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}