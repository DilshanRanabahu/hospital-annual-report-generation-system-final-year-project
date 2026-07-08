import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    empId: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successNotification, setSuccessNotification] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.empId.trim()) {
      newErrors.empId = 'Employee ID is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Role-based navigation function
  const navigateBasedOnRole = useCallback((role) => {
    switch (role) {
      case 'CLINIC_NURSE':
        navigate('/ClinicManagement');
        break;
      case 'WARD_NURSE':
        navigate('/wardManagement');
        break;
      case 'DIALYSIS_NURSE':
      case 'DIALYSIS_DOCTOR':
        navigate('/dialysisManagement');
        break;
      case 'DOCTOR':
        navigate('/DoctorDashboard');
        break;
      case 'PHARMACIST':
        navigate('/pharmacyManagement');
        break;
      case 'LAB_TECH':
      case 'LAB_TECHNICIAN':
        navigate('/labManagement');
        break;
      default:
        navigate('/dialysisManagement');
        break;
    }
  }, [navigate]);

  // Auto-hide success notification and navigate
  useEffect(() => {
    if (successNotification) {
      const timer = setTimeout(() => {
        setSuccessNotification(null);
        navigateBasedOnRole(successNotification.role);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [successNotification, navigateBasedOnRole]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await axios.post('/api/auth/login', {
        empId: formData.empId,
        password: formData.password
      });

      const data = response.data;

      if (data.isSuccess) {
        // Store JWT token in localStorage
        localStorage.setItem('jwtToken', data.jwtToken);
        
        // Decode and store user info from JWT token
        try {
          const tokenPayload = JSON.parse(atob(data.jwtToken.split('.')[1]));
          const userRole = tokenPayload.role;
          const empId = tokenPayload.sub;
          
          localStorage.setItem('empId', empId);
          localStorage.setItem('role', userRole);
          
          // Simple success notification
          setSuccessNotification({
            message: `Welcome ${formData.empId}!`,
            role: userRole
          });
          
        } catch (decodeError) {
          console.warn('Could not decode JWT token:', decodeError);
          setErrors({ general: 'Authentication error. Please contact IT support.' });
        }
        
      } else {
        setErrors({ general: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          setErrors({ general: 'Network error. Please check your connection and ensure the server is running.' });
        } else if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            setErrors({ general: 'Invalid credentials. Please check your employee ID and password.' });
          } else if (status === 403) {
            setErrors({ general: 'Access denied. Please contact your administrator.' });
          } else {
            setErrors({ general: error.response.data.message || 'Login failed' });
          }
        } else {
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8 items-stretch justify-center">
        
        {/* Left Side: Demo Accounts */}
        <div className="w-full md:w-1/2 flex flex-col order-2 md:order-1 justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-8 border border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Demo Accounts</h3>
              <p className="text-sm text-gray-500 mt-2">
                Click any account to automatically fill the login form and explore the system.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div onClick={() => { setFormData({empId: 'ADMIN001', password: 'ADMIN001'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-blue-100 transition-all active:scale-95 p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-blue-900 text-base">Admin</span>
                <span className="text-blue-700 font-mono text-xs">ADMIN001</span>
              </div>
              <div onClick={() => { setFormData({empId: 'DOC01', password: 'doctor123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-indigo-100 transition-all active:scale-95 p-4 bg-indigo-50 rounded-xl border border-indigo-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-indigo-900 text-base">Doctor</span>
                <span className="text-indigo-700 font-mono text-xs">DOC01</span>
              </div>
              <div onClick={() => { setFormData({empId: 'CLINIC01', password: 'nurse123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-green-100 transition-all active:scale-95 p-4 bg-green-50 rounded-xl border border-green-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-green-900 text-base">Clinic Nurse</span>
                <span className="text-green-700 font-mono text-xs">CLINIC01</span>
              </div>
              <div onClick={() => { setFormData({empId: 'WARD01', password: 'nurse123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-emerald-100 transition-all active:scale-95 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-emerald-900 text-base">Ward Nurse</span>
                <span className="text-emerald-700 font-mono text-xs">WARD01</span>
              </div>
              <div onClick={() => { setFormData({empId: 'DIALYSIS01', password: 'nurse123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-teal-100 transition-all active:scale-95 p-4 bg-teal-50 rounded-xl border border-teal-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-teal-900 text-base">Dialysis Nurse</span>
                <span className="text-teal-700 font-mono text-xs">DIALYSIS01</span>
              </div>
              <div onClick={() => { setFormData({empId: 'PHARM01', password: 'pharm123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-purple-100 transition-all active:scale-95 p-4 bg-purple-50 rounded-xl border border-purple-200 flex flex-col items-center justify-center gap-1">
                <span className="font-semibold text-purple-900 text-base">Pharmacist</span>
                <span className="text-purple-700 font-mono text-xs">PHARM01</span>
              </div>
              <div onClick={() => { setFormData({empId: 'LAB01', password: 'lab123'}); setErrors({}); }} className="group cursor-pointer hover:shadow-md hover:bg-orange-100 transition-all active:scale-95 p-4 bg-orange-50 rounded-xl border border-orange-200 flex flex-col items-center justify-center gap-1 sm:col-span-2">
                <span className="font-semibold text-orange-900 text-base">Lab Technician</span>
                <span className="text-orange-700 font-mono text-xs">LAB01</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 max-w-md flex flex-col justify-center order-1 md:order-2">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hospital Login</h1>
          <p className="text-gray-600">National Institute of Nephrology, Dialysis and Transplantation</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="space-y-6">
            {/* Success Notification */}
            {successNotification && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">{successNotification.message}</p>
              </div>
            )}

            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Employee ID Field */}
            <div>
              <label htmlFor="empId" className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="empId"
                  name="empId"
                  value={formData.empId}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.empId ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="Enter your employee ID"
                />
              </div>
              {errors.empId && (
                <p className="mt-1 text-sm text-red-600">{errors.empId}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } ${isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm flex items-center justify-center ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : successNotification ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redirecting...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure access to Hospital Operation Management System
            </p>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}