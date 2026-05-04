'use client';

import { useState, useEffect } from 'react';
import { Repository, ApiResponse } from '../../lib/types';
import { apiClient } from '../../lib/api/client';
import { repositoriesApi } from '../../lib/api/repositories';
import { AuthGuard } from '../../components/auth-guard';
import ImportRepoDialog from '../../components/import-repo-dialog';
import Skeleton from '../../components/ui/skeleton';

function RepositoryCard({ repository }: { repository: Repository }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'importing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {repository.name}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              repository.status
            )}`}
          >
            {repository.status}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            <span className="font-medium">Full name:</span> {repository.fullName}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium">Analyses:</span> {repository._count.analyses}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium">Imported:</span>{' '}
            {new Date(repository.importedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="mt-4">
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}

function LearningProgressRing({ repositoryId }: { repositoryId: string }) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProgress = async () => {
      try {
        const stats = await repositoriesApi.getRepositoryStats(repositoryId);
        const explanations = await repositoriesApi.listExplanations(repositoryId);
        
        // Calculate potential explanations (files * 5 depth levels)
        const potentialExplanations = stats.fileCount * 5;
        const actualExplanations = explanations.total;
        const progressPercentage = potentialExplanations > 0 ? (actualExplanations / potentialExplanations) * 100 : 0;
        
        setProgress(Math.round(progressPercentage));
      } catch (error) {
        setProgress(0);
      } finally {
        setLoading(false);
      }
    };

    calculateProgress();
  }, [repositoryId]);

  if (loading) {
    return <Skeleton variant="circle" width={120} height={120} />;
  }

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#3b82f6"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute">
          <span className="text-2xl font-bold text-gray-900">{progress}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">Learning Progress</p>
    </div>
  );
}

function ActivityFeed() {
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: 'explanation' | 'rebuild' | 'import';
    description: string;
    timestamp: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock activity data - in a real implementation, this would come from an API
    const mockActivities = [
      {
        id: '1',
        type: 'explanation' as const,
        description: 'Viewed explanation for src/main.ts',
        timestamp: '2 min ago',
      },
      {
        id: '2',
        type: 'rebuild' as const,
        description: 'Completed step 3 of rebuild guide',
        timestamp: '15 min ago',
      },
      {
        id: '3',
        type: 'import' as const,
        description: 'Imported repository awesome-project',
        timestamp: '1 hour ago',
      },
    ];

    setTimeout(() => {
      setActivities(mockActivities);
      setLoading(false);
    }, 1000);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'explanation': return '🤖';
      case 'rebuild': return '📝';
      case 'import': return '📁';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton variant="circle" width={32} height={32} />
            <div className="flex-1">
              <Skeleton variant="text" lines={1} />
              <Skeleton variant="text" lines={1} width="60%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-xl">{getActivityIcon(activity.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{activity.description}</p>
            <p className="text-xs text-gray-500">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickResumeCard({ repository }: { repository: Repository }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{repository.name}</h4>
        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
          In Progress
        </span>
      </div>
      <p className="text-sm mb-3 opacity-90">Resume Step 3 of 15</p>
      <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors">
        Continue Learning →
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <Skeleton variant="text" lines={1} className="mb-4" />
            <div className="space-y-2">
              <Skeleton variant="text" lines={3} />
            </div>
            <Skeleton variant="text" lines={1} width="33%" className="mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories</h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by importing your first repository.
      </p>
      <div className="mt-6">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="mr-2 -ml-1 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Import Repository
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await apiClient.get<ApiResponse<Repository[]>>('/repositories');
        setRepositories(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch repositories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  const handleImportSuccess = () => {
    // Refresh repositories after successful import
    const fetchRepositories = async () => {
      try {
        const response = await apiClient.get<ApiResponse<Repository[]>>('/repositories');
        setRepositories(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch repositories');
      }
    };

    fetchRepositories();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Repositories</h1>
            <p className="mt-2 text-gray-600">
              Manage and analyze your GitHub repositories
            </p>
          </div>

          {isLoading && <LoadingSkeleton />}

          {!isLoading && error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {!isLoading && !error && repositories.length === 0 && <EmptyState />}

          {!isLoading && !error && repositories.length > 0 && (
            <>
              {/* Enhanced Dashboard with Progress and Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Learning Progress */}
                <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Progress</h3>
                  {repositories.length > 0 && (
                    <LearningProgressRing repositoryId={repositories[0].id} />
                  )}
                </div>

                {/* Activity Feed */}
                <div className="bg-white overflow-hidden shadow rounded-lg p-6 lg:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <ActivityFeed />
                </div>

                {/* Quick Resume */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Continue Learning</h3>
                  {repositories.slice(0, 2).map((repo) => (
                    <QuickResumeCard key={repo.id} repository={repo} />
                  ))}
                </div>
              </div>

              {/* Existing Repository Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repositories.map((repository) => (
                  <RepositoryCard key={repository.id} repository={repository} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      <ImportRepoDialog 
        isOpen={isImportDialogOpen} 
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </AuthGuard>
  );
}
