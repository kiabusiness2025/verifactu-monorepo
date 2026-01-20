'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface WorkflowStats {
  total: number;
  success: number;
  failure: number;
  successRate: number;
}

interface Metrics {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  recentRuns: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    duration: number;
    branch: string;
    url: string;
    timestamp: string;
  }>;
  byWorkflow: Record<string, WorkflowStats>;
}

export default function CICDMetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/cicd-metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getStatusColor = (conclusion: string | null) => {
    switch (conclusion) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failure': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (conclusion: string | null) => {
    switch (conclusion) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'failure': return <XCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">CI/CD Metrics Dashboard</h2>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Runs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalRuns}</p>
            </div>
            <Activity className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics.successRate}%</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatDuration(metrics.avgDuration)}
              </p>
            </div>
            <Clock className="h-10 w-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Workflow Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Statistics</h3>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(metrics.byWorkflow).map(([name, stats]) => (
            <div key={name} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{name}</h4>
                <span className="text-sm text-gray-600">
                  {stats.total} runs
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-600 h-full transition-all duration-300"
                    style={{ width: `${stats.successRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 min-w-[50px]">
                  {stats.successRate}%
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">✓ {stats.success}</span>
                <span className="text-red-600">✗ {stats.failure}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Workflow Runs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.recentRuns.slice(0, 10).map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(run.conclusion)}`}>
                      {getStatusIcon(run.conclusion)}
                      <span className="text-sm font-medium">
                        {run.conclusion || run.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-1 rounded">{run.branch}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(run.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(run.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={run.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
