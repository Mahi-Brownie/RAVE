'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { repositoriesApi, Repository } from '../lib/api/repositories';

interface ImportRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportRepoDialog({ isOpen, onClose }: ImportRepoDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importStage, setImportStage] = useState<'cloning' | 'analyzing' | 'ready'>('cloning');
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const validateGitHubUrl = (url: string): boolean => {
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+(\/.*)?$/;
    return githubUrlPattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }

    if (!validateGitHubUrl(url)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStatus('importing');

      // Import repository
      const result = await repositoriesApi.importRepository(url.trim());
      setRepository(result);

      // Poll for status
      await pollRepositoryStatus(result.id);

      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to import repository');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const pollRepositoryStatus = async (repoId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const repo = await repositoriesApi.getRepository(repoId);
        
        // Update stage and progress based on status
        if (repo.status === 'pending') {
          setImportStage('cloning');
          setProgress(Math.min(20, attempts * 2)); // Slow progress for cloning
        } else if (repo.status === 'cloning') {
          setImportStage('cloning');
          setProgress(Math.min(40, 20 + (attempts * 2)));
        } else if (repo.status === 'cloned') {
          setImportStage('analyzing');
          setProgress(Math.min(70, 40 + (attempts * 3)));
        } else if (repo.status === 'analyzing') {
          setImportStage('analyzing');
          setProgress(Math.min(90, 70 + (attempts * 2)));
        } else if (repo.status === 'analyzed') {
          setImportStage('ready');
          setProgress(100);
          setRepository(repo);
          return;
        }

        if (repo.status === 'error') {
          throw new Error('Repository import failed');
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          throw new Error('Import timeout');
        }
      } catch (error) {
        throw error;
      }
    };

    await poll();
  };

  const handleClose = () => {
    if (status === 'success' && repository) {
      router.push(`/projects/${repository.id}`);
    }
    onClose();
    // Reset state
    setUrl('');
    setError(null);
    setRepository(null);
    setStatus('idle');
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'importing':
        return 'Importing repository...';
      case 'success':
        return 'Repository imported successfully!';
      case 'error':
        return 'Import failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'importing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Import Repository
          </h3>
          
          {status === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Import a GitHub repository to analyze</span>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Find repos →
                </a>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          )}

          {(status === 'importing' || status === 'success' || status === 'error') && (
            <div className="space-y-4">
              <div className="text-center">
                {status === 'importing' && (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className={`text-lg font-medium ${getStatusColor()}`}>
                      {getStatusMessage()}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-medium text-blue-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      {/* Stages */}
                      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                        <div className={`flex items-center space-x-1 ${
                          importStage === 'cloning' ? 'text-blue-600 font-medium' : 'text-gray-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            importStage === 'cloning' ? 'bg-blue-600' : 'bg-gray-300'
                          }`}></div>
                          <span>Cloning</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${
                          importStage === 'analyzing' ? 'text-blue-600 font-medium' : 'text-gray-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            importStage === 'analyzing' ? 'bg-blue-600' : 'bg-gray-300'
                          }`}></div>
                          <span>Analyzing</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${
                          importStage === 'ready' ? 'text-green-600 font-medium' : 'text-gray-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            importStage === 'ready' ? 'bg-green-600' : 'bg-gray-300'
                          }`}></div>
                          <span>Ready</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {status === 'success' && (
                  <>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className={`text-lg font-medium ${getStatusColor()}`}>
                      {getStatusMessage()}
                    </p>
                    
                    {repository && (
                      <div className="mt-4 text-sm text-gray-600">
                        <p className="font-medium">{repository.name}</p>
                        <p>{repository.fullName}</p>
                        <div className="mt-2 flex items-center justify-center space-x-4">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {repository.fileCount || 0} files
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {repository.totalLines || 0} lines
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {repository.language || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {status === 'error' && (
                  <>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className={`text-lg font-medium ${getStatusColor()}`}>
                      {getStatusMessage()}
                    </p>
                    
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {status === 'success' ? 'View Repository' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
