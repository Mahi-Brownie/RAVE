'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { apiClient } from '../../../lib/api/client';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  status: string;
  language?: string;
  fileCount?: number;
  totalLines?: number;
  createdAt: string;
}

const tabs = [
  { name: 'Overview', href: '' },
  { name: 'Code Explorer', href: 'code' },
  { name: 'Dependencies', href: 'dependencies' },
  { name: 'Rebuild Guide', href: 'rebuild' },
];

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

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repositoryId = params.id as string;
  const currentPath = router.pathname.split('/').pop() || '';

  useEffect(() => {
    fetchRepository();
  }, [repositoryId]);

  const fetchRepository = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: Repository }>(`/repositories/${repositoryId}`);
      setRepository(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repository');
      setRepository(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded w-20"></div>
                  ))}
                </nav>
              </div>
              <div className="mt-8">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !repository) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Repository Not Found</h1>
              <p className="text-gray-600 mb-4">{error || 'The requested repository could not be found.'}</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{repository.name}</h1>
                <p className="text-gray-600">{repository.fullName}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    repository.status
                  )}`}
                  role="status"
                  aria-label={`Repository status: ${repository.status}`}
                >
                  {repository.status}
                </span>
                {repository.language && (
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    role="status"
                    aria-label={`Programming language: ${repository.language}`}
                  >
                    {repository.language}
                  </span>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                <div className="text-sm font-medium text-gray-500">Files</div>
                <div className="text-2xl font-bold text-gray-900" aria-label={`Number of files: ${repository.fileCount || 0}`}>
                  {repository.fileCount || 0}
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                <div className="text-sm font-medium text-gray-500">Lines of Code</div>
                <div className="text-2xl font-bold text-gray-900" aria-label={`Lines of code: ${repository.totalLines || 0}`}>
                  {repository.totalLines || 0}
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(repository.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200" role="navigation" aria-label="Project sections">
            <nav 
              className="-mb-px flex space-x-8 overflow-x-auto" 
              role="tablist"
              aria-label="Project navigation tabs"
            >
              {tabs.map((tab, index) => {
                const isActive = (tab.href === '' && currentPath === 'projects') || 
                                (tab.href !== '' && currentPath === tab.href);
                
                return (
                  <Link
                    key={tab.name}
                    href={`/projects/${repositoryId}${tab.href ? `/${tab.href}` : ''}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.name.toLowerCase().replace(/\s+/g, '-')}`}
                    id={`tab-${tab.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`${
                      isActive
                        ? 'border-blue-500 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Page Content */}
          <main id="main-content" className="mt-8" role="main">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
