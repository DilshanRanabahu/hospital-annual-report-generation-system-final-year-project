import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  PackageX,
  Calendar,
  Pill,
  TrendingDown,
  AlertCircle,
  Package
} from 'lucide-react';
import axios from 'axios';

export default function InventoryAlerts({ loading: externalLoading }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(90); // Default to 90 days (3 months)

  // Fetch alerts data from backend
  useEffect(() => {
    const fetchAlertsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/pharmacy/medications/alerts`, {
          params: { daysUntilExpiry }
        });
        
        setAlertsData(response.data);
        console.log('Alerts data fetched:', response.data);
      } catch (err) {
        console.error('Error fetching alerts data:', err);
        setError('Failed to load alerts data');
      } finally {
        setLoading(false);
      }
    };

    fetchAlertsData();
  }, [daysUntilExpiry]);

  const categories = useMemo(() => {
    if (!alertsData) {
      return [
        { id: 'all', label: 'All Alerts', icon: AlertTriangle, count: 0, color: 'text-gray-600' },
        { id: 'expired', label: 'Expired', icon: AlertCircle, count: 0, color: 'text-red-600' },
        { id: 'nearExpiry', label: 'Near Expiry', icon: Clock, count: 0, color: 'text-orange-600' },
        { id: 'outOfStock', label: 'Out of Stock', icon: PackageX, count: 0, color: 'text-red-600' },
        { id: 'lowStock', label: 'Low Stock', icon: TrendingDown, count: 0, color: 'text-yellow-600' }
      ];
    }

    return [
      { 
        id: 'all', 
        label: 'All Alerts', 
        icon: AlertTriangle,
        count: alertsData.summary?.totalAlerts || 0,
        color: 'text-gray-600'
      },
      { 
        id: 'expired', 
        label: 'Expired', 
        icon: AlertCircle,
        count: alertsData.summary?.expiredCount || 0,
        color: 'text-red-600'
      },
      { 
        id: 'nearExpiry', 
        label: 'Near Expiry', 
        icon: Clock,
        count: alertsData.summary?.nearExpiryCount || 0,
        color: 'text-orange-600'
      },
      { 
        id: 'outOfStock', 
        label: 'Out of Stock', 
        icon: PackageX,
        count: alertsData.summary?.outOfStockCount || 0,
        color: 'text-red-600'
      },
      { 
        id: 'lowStock', 
        label: 'Low Stock', 
        icon: TrendingDown,
        count: alertsData.summary?.lowStockCount || 0,
        color: 'text-yellow-600'
      }
    ];
  }, [alertsData]);

  const getDisplayedAlerts = () => {
    if (!alertsData) return [];

    switch (selectedCategory) {
      case 'expired': 
        return alertsData.expiredMedications || [];
      case 'nearExpiry': 
        return alertsData.nearExpiryMedications || [];
      case 'outOfStock': 
        return alertsData.outOfStockMedications || [];
      case 'lowStock': 
        return alertsData.lowStockMedications || [];
      default: 
        return [
          ...(alertsData.expiredMedications || []),
          ...(alertsData.nearExpiryMedications || []),
          ...(alertsData.outOfStockMedications || []),
          ...(alertsData.lowStockMedications || [])
        ];
    }
  };

  const getAlertBadge = (alertType) => {
    const badges = {
      'EXPIRED': <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Expired</span>,
      'NEAR_EXPIRY': <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Near Expiry</span>,
      'OUT_OF_STOCK': <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Out of Stock</span>,
      'LOW_STOCK': <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Low Stock</span>
    };
    
    return badges[alertType] || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'border-l-red-500';
      case 'MEDIUM': return 'border-l-orange-500';
      case 'LOW': return 'border-l-yellow-500';
      default: return 'border-l-gray-500';
    }
  };

  if (loading || externalLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Alerts</h2>
          <p className="text-gray-600 mt-1">Monitor stock levels, expiry dates, and critical alerts</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Days filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Days until expiry:</label>
            <select 
              value={daysUntilExpiry}
              onChange={(e) => setDaysUntilExpiry(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={7}>7 days</option>
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              {categories.find(c => c.id === 'all')?.count || 0} Total Alerts
            </span>
          </div>
        </div>
      </div>

      {/* Alert Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${category.color}`} />
                <span className={`text-2xl font-bold ${category.color}`}>
                  {category.count}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">{category.label}</p>
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {categories.find(c => c.id === selectedCategory)?.label || 'All Alerts'}
          </h3>
        </div>

        <div className="p-6">
          {getDisplayedAlerts().length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No alerts in this category</p>
              <p className="text-sm text-gray-500 mt-1">All medications are within acceptable levels</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getDisplayedAlerts().map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Pill className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.drugName}</h4>
                      <p className="text-sm text-gray-600">{item.genericName}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Stock:</span> {item.currentStock}
                        </p>
                        {item.minimumStock && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Min:</span> {item.minimumStock}
                          </p>
                        )}
                        {item.expiryDate && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Expires:</span> {formatDate(item.expiryDate)}
                          </p>
                        )}
                        {item.daysUntilExpiry !== null && item.daysUntilExpiry !== undefined && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Days left:</span> {item.daysUntilExpiry}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">Batch: {item.batchNumber}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{item.category}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{item.strength}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getAlertBadge(item.alertType)}
                    {item.priority === 'HIGH' && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-200">
                        {item.priority}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}