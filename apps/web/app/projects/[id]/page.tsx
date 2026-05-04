'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  status: string;
  language?: string;
  fileCount?: number;
  totalLines?: number;
  createdAt: string;
  updatedAt: string;
}

interface Explanation {
  id: string;
  filePath: string;
  depthLevel: number;
  createdAt: string;
}

interface Analysis {
  id: string;
  type: string;
  status: string;
  progressPct: number;
  createdAt: string;
  completedAt?: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cloning':
      return 'bg-blue-100 text-blue-800';
    case 'cloned':
      return 'bg-green-100 text-green-800';
    case 'analyzing':
      return 'bg-purple-100 text-purple-800';
    case 'analyzed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getAnalysisTypeColor(type: string) {
  switch (type) {
    case 'security':
      return 'bg-red-100 text-red-800';
    case 'performance':
      return 'bg-orange-100 text-orange-800';
    case 'code-quality':
      return 'bg-blue-100 text-blue-800';
    case 'dependencies':
      return 'bg-green-100 text-green-800';
    case 'dependency_graph':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ProjectOverview() {
  const params = useParams();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repositoryId = params.id as string;

  useEffect(() => {
    fetchData();
  }, [repositoryId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch repository details
      const repoResponse = await apiClient.get<{ data: Repository }>(`/repositories/${repositoryId}`);
      setRepository(repoResponse.data);

      // Fetch recent explanations
      try {
        const explanationsResponse = await apiClient.get<{ explanations: Explanation[] }>(`/repositories/${repositoryId}/explanations`);
        setExplanations(explanationsResponse.explanations.slice(0, 5)); // Last 5 explanations
      } catch (err) {
        // Explanations might not exist yet
        setExplanations([]);
      }

      // Fetch analyses
      try {
        const analysesResponse = await apiClient.get<{ data: Analysis[] }>(`/repositories/${repositoryId}/analyses`);
        setAnalyses(analysesResponse.data);
      } catch (err) {
        // Analyses might not exist yet
        setAnalyses([]);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repository data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusFlow = () => {
    const statuses = ['pending', 'cloning', 'cloned', 'analyzing', 'analyzed'];
    const currentStatus = repository?.status || 'pending';
    const currentIndex = statuses.indexOf(currentStatus);
    
    return statuses.map((status, index) => ({
      status,
      isActive: index === currentIndex,
      isCompleted: index < currentIndex,
      isUpcoming: index > currentIndex,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="animate-pulse">
          <div className="bg-white overflow-hidden shadow rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Flow */}
      <div className="bg-white overflow-hidden shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Repository Status</h2>
        <div className="flex items-center justify-between">
          {getStatusFlow().map((step, index) => (
            <div key={step.status} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.isCompleted
                    ? 'bg-green-500 text-white'
                    : step.isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step.isCompleted ? '✓' : index + 1}
              </div>
              <div className="ml-2 text-sm">
                <div
                  className={`font-medium ${
                    step.isActive ? 'text-blue-600' : step.isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </div>
              </div>
              {index < getStatusFlow().length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white overflow-hidden shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/projects/${repositoryId}/code`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            📁 Explore Code
          </Link>
          <Link
            href={`/projects/${repositoryId}/dependencies`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            🕸️ Dependencies
          </Link>
          <Link
            href={`/projects/${repositoryId}/rebuild`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            📝 Rebuild Guide
          </Link>
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            🔗 View on GitHub
          </a>
        </div>
      </div>

      {/* Recent Analyses */}
      {analyses.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Analyses</h2>
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAnalysisTypeColor(
                      analysis.type
                    )}`}
                  >
                    {analysis.type}
                  </span>
                  <span className="text-sm text-gray-900">{analysis.type} analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  {analysis.status === 'completed' ? (
                    <span className="text-sm text-green-600">Completed</span>
                  ) : analysis.status === 'processing' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${analysis.progressPct}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{analysis.progressPct}%</span>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      analysis.status
                    )}`}
                    >
                      {analysis.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Explanations */}
      {explanations.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Explanations</h2>
          <div className="space-y-3">
            {explanations.map((explanation) => (
              <div key={explanation.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{explanation.filePath}</div>
                  <div className="text-xs text-gray-500">Depth {explanation.depthLevel}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(explanation.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          {explanations.length >= 5 && (
            <div className="mt-4">
              <Link
                href={`/projects/${repositoryId}/code`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all explanations →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Repository Details */}
      <div className="bg-white overflow-hidden shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Repository Details</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Full Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{repository.fullName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Language</dt>
            <dd className="mt-1 text-sm text-gray-900">{repository.language || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(repository.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(repository.updatedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
