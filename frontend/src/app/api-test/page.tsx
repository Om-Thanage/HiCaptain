'use client';

import { useEffect, useState } from 'react';
import { dashboardService } from '@/services/dashboard';

export default function ApiTestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getDashboardData();
      setData(result);
      console.log('API Response:', result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">API Test Page</h1>
        
        <button
          onClick={testApi}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg mb-4"
        >
          {loading ? 'Loading...' : 'Test Dashboard API'}
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {data && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Response:</h2>
            <pre className="text-slate-300 text-sm overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}