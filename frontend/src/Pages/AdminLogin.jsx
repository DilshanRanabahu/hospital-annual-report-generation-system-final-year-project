"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Heart, Shield, User, Lock, CheckCircle, XCircle, AlertCircle, LogIn, Loader2 } from "lucide-react";

// Toast Component
const Toast = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto close after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const toastStyles = {
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      icon: <CheckCircle size={20} className="text-emerald-500" />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: <XCircle size={20} className="text-red-500" />,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: <AlertCircle size={20} className="text-blue-500" />,
    },
  };

  const style = toastStyles[type] || toastStyles.info;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-full duration-300">
      <div
        className={`max-w-sm rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-sm ${style.bg} ${style.border}`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${style.text}`}>{message}</p>
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 rounded-lg p-1.5 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors ${style.text}`}
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    type: "info",
  });

  const showToast = (message, type = "info") => {
    setToast({
      isVisible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate empty fields with modern error display
    if (!formData.employeeId.trim() || !formData.password.trim()) {
      setError(
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <span className="font-medium text-red-800">
              {!formData.employeeId.trim() && !formData.password.trim()
                ? "Authentication Required"
                : !formData.employeeId.trim()
                ? "Employee ID Missing"
                : "Password Required"}
            </span>
            <p className="text-sm text-red-600 mt-0.5">
              {!formData.employeeId.trim() && !formData.password.trim()
                ? "Please provide both your Employee ID and Password to continue"
                : !formData.employeeId.trim()
                ? "Please enter your Employee ID to proceed"
                : "Please enter your password to secure access"}
            </p>
          </div>
        </div>
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "/api/auth/login",
        {
          empId: formData.employeeId,
          password: formData.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const data = response.data;

      // In the handleSubmit function, replace the success handling part:

      if (data.isSuccess) {
        // Decode JWT to check role BEFORE storing anything
        const tokenPayload = JSON.parse(atob(data.jwtToken.split(".")[1]));
        const userRole = tokenPayload.role;

        // Check if user has admin role
        if (userRole !== "ADMIN") {
          // Don't store any data for non-admin users
          setError(
            <div className="flex items-center space-x-2">
              <Shield size={20} className="text-red-500" />
              <span>Access denied. Admin privileges required.</span>
            </div>
          );
          showToast(
            "Access denied. This portal is for administrators only.",
            "error"
          );
          return; // Exit without storing anything
        }

        // Only store data if user is an admin
        localStorage.setItem("adminToken", data.jwtToken);
        localStorage.setItem("empId", tokenPayload.sub);
        localStorage.setItem("role", userRole);

        // Show success toast
        showToast(
          "Admin login successful! Redirecting to dashboard...",
          "success"
        );

        // Navigate after a short delay
        setTimeout(() => {
          navigate("/admin-dashboard");
        }, 1500);
      } else {
        showToast(
          data.message || "Login failed. Please check your credentials.",
          "error"
        );
      }
    } catch (err) {
      console.error("Login error:", err);

      // Enhanced error handling with specific messages
      if (err.response) {
        const status = err.response.status;

        switch (status) {
          case 401:
            setError(
              <div className="flex items-center space-x-2">
                <span>
                  Invalid credentials. Please check your Employee ID and
                  password.
                </span>
              </div>
            );
            showToast(
              "Invalid credentials. Please check your Employee ID and password.",
              "error"
            );
            break;
          case 403:
            setError(
              <div className="flex items-center space-x-2">
                <Shield size={20} className="text-red-500" />
                <span>Access denied. Admin privileges required.</span>
              </div>
            );
            showToast("Access denied. Admin privileges required.", "error");
            break;
          default: {
            const errorMsg =
              err.response.data?.message ||
              "An error occurred. Please try again.";
            setError(
              <div className="flex items-center space-x-2">
                <AlertCircle size={20} className="text-red-500" />
                <span>{errorMsg}</span>
              </div>
            );
            showToast(errorMsg, "error");
          }
        }
      } else if (err.request) {
        const networkError =
          "Network error. Please check your connection and try again.";
        setError(
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} className="text-red-500" />
            <span>{networkError}</span>
          </div>
        );
        showToast(networkError, "error");
      } else {
        const unexpectedError =
          "An unexpected error occurred. Please try again.";
        setError(
          <div className="flex items-center space-x-2">
            <XCircle size={20} className="text-red-500" />
            <span>{unexpectedError}</span>
          </div>
        );
        showToast(unexpectedError, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toast Component */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-lg">
          {/* Hospital Logo/Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-xl">
                  <Heart size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <Shield size={10} className="text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Hospital Management Admin Portal
              </h1>
              <div className="flex items-center justify-center space-x-2 text-gray-700">
                <Shield size={14} className="text-blue-600" />
                <p className="text-xs font-medium">
                  National Institute of Nephrology, Dialysis and Transplantation
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-700 font-medium">System Online & Secure</span>
              </div>
            </div>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-white/20 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Administrator Access
                </h2>
              </div>
              <p className="text-center text-gray-600 text-sm font-medium">
                Secure authentication required for system access
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl border-2 border-red-200 bg-red-50/80 backdrop-blur-sm">
                  <div className="flex">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Employee ID Field */}
              <div>
                <label
                  htmlFor="employeeId"
                  className="block text-sm font-semibold mb-2 text-gray-800"
                >
                  Employee ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm font-medium"
                    placeholder="Enter your employee ID"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold mb-2 text-gray-800"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm font-medium"
                    placeholder="Enter your secure password"
                    required
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>

              {/* Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/25 shadow-lg ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      <span>Access Admin Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-emerald-700">
                <Shield size={12} />
                <p className="text-xs font-medium">
                  256-bit SSL Encrypted • HIPAA Compliant
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Text */}
          <div className="mt-4 text-center">
            <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Heart size={12} className="text-blue-600" />
                <span className="text-xs font-semibold text-gray-800">
                  Hospital Management System
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-tight">
                © {new Date().getFullYear()} National Institute of Nephrology, Dialysis and Transplantation
                <br />
                <span className="flex items-center justify-center mt-1 space-x-1">
                  <Shield size={10} className="text-emerald-600" />
                  <span>Secure • Authorized Personnel Only</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
