import { apiClient } from './client';

export interface Repository {
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

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

export interface FileContent {
  content: string;
  size: number;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'file' | 'package' | 'external';
    data?: {
      path?: string;
      language?: string;
      size?: number;
    };
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'import' | 'export' | 'require';
    data?: {
      line?: number;
      alias?: string;
    };
  }>;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    repositoryId: string;
    generatedAt: string;
  };
}

export interface RebuildStep {
  order: number;
  title: string;
  description: string;
  filePath: string;
  dependencies: string[];
  codeTemplate: string;
  explanation: string;
  whyThisMatters: string;
}

export interface RebuildGuide {
  repositoryId: string;
  complexity: number;
  totalSteps: number;
  steps: RebuildStep[];
  generatedAt: string;
}

export interface Explanation {
  explanation: string;
  repositoryId: string;
  filePath: string;
  depth: number;
  generatedAt: string;
}

export interface Analysis {
  id: string;
  type: string;
  status: string;
  progressPct: number;
  createdAt: string;
  completedAt?: string;
}

// Repository API functions
export const repositoriesApi = {
  // Get all repositories for the user
  getRepositories: async () => {
    const response = await apiClient.get<{ data: Repository[] }>('/repositories');
    return response.data;
  },

  // Get single repository
  getRepository: async (id: string) => {
    const response = await apiClient.get<{ data: Repository }>(`/repositories/${id}`);
    return response.data;
  },

  // Import new repository
  importRepository: async (url: string) => {
    const response = await apiClient.post<{ data: Repository }>('/repositories', { url });
    return response.data;
  },

  // Delete repository
  deleteRepository: async (id: string) => {
    await apiClient.delete(`/repositories/${id}`);
  },

  // Get file tree
  getFiles: async (repositoryId: string, page = 1, limit = 100) => {
    const response = await apiClient.get<{
      files: FileNode[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/repositories/${repositoryId}/files?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get file content
  getFileContent: async (repositoryId: string, filePath: string) => {
    const response = await apiClient.get<FileContent>(
      `/repositories/${repositoryId}/files/content?path=${encodeURIComponent(filePath)}`
    );
    return response.data;
  },

  // Get repository stats
  getRepositoryStats: async (repositoryId: string) => {
    const response = await apiClient.get<{
      fileCount: number;
      totalSize: number;
      totalLines: number;
    }>(`/repositories/${repositoryId}/files/stats`);
    return response.data;
  },

  // Search files
  searchFiles: async (repositoryId: string, query: string, limit = 50) => {
    const response = await apiClient.get<FileNode[]>(
      `/repositories/${repositoryId}/files/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  },

  // Get directory contents
  getDirectoryContents: async (repositoryId: string, dirPath = '') => {
    const response = await apiClient.get<FileNode[]>(
      `/repositories/${repositoryId}/files/directory${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`
    );
    return response.data;
  },

  // Get files by extension
  getFilesByExtension: async (repositoryId: string, extensions: string[]) => {
    const extParams = extensions.map(ext => `ext=${encodeURIComponent(ext)}`).join('&');
    const response = await apiClient.get<FileNode[]>(
      `/repositories/${repositoryId}/files/extensions?${extParams}`
    );
    return response.data;
  },

  // Trigger analysis
  triggerAnalysis: async (repositoryId: string, types: string[]) => {
    const response = await apiClient.post<{
      jobIds: string[];
      queueJobIds: string[];
    }>(`/repositories/${repositoryId}/analyze`, { types });
    return response.data;
  },

  // Get analysis status
  getAnalysisStatus: async (repositoryId: string) => {
    const response = await apiClient.get<Analysis[]>(`/repositories/${repositoryId}/analyses`);
    return response.data;
  },

  // Get dependency graph
  getDependencies: async (repositoryId: string, depth?: number) => {
    const url = depth 
      ? `/repositories/${repositoryId}/dependencies?depth=${depth}`
      : `/repositories/${repositoryId}/dependencies`;
    const response = await apiClient.get<DependencyGraph>(url);
    return response.data;
  },

  // Get cached dependency graph
  getCachedDependencies: async (repositoryId: string) => {
    const response = await apiClient.get<DependencyGraph | { message: string; graph: null }>(
      `/repositories/${repositoryId}/dependencies/cached`
    );
    return response.data;
  },

  // Get dependency stats
  getDependencyStats: async (repositoryId: string) => {
    const response = await apiClient.get(
      `/repositories/${repositoryId}/dependencies/stats`
    );
    return response.data;
  },

  // Get code explanation
  getExplanation: async (repositoryId: string, filePath: string, depth = 3) => {
    const response = await apiClient.get<Explanation>(
      `/repositories/${repositoryId}/explain?file=${encodeURIComponent(filePath)}&depth=${depth}`
    );
    return response.data;
  },

  // List explanations
  listExplanations: async (repositoryId: string) => {
    const response = await apiClient.get<{
      repositoryId: string;
      explanations: Array<{
        id: string;
        filePath: string;
        depthLevel: number;
        createdAt: Date;
      }>;
      total: number;
    }>(`/repositories/${repositoryId}/explanations`);
    return response.data;
  },

  // Get rebuild steps
  getRebuildSteps: async (repositoryId: string, complexity = 2) => {
    const response = await apiClient.get<RebuildGuide>(
      `/repositories/${repositoryId}/rebuild-steps?complexity=${complexity}`
    );
    return response.data;
  },

  // Get single rebuild step
  getRebuildStep: async (repositoryId: string, stepNumber: number, complexity = 2) => {
    const response = await apiClient.get<{
      repositoryId: string;
      complexity: number;
      stepNumber: number;
      step: RebuildStep;
    }>(`/repositories/${repositoryId}/rebuild-steps/${stepNumber}?complexity=${complexity}`);
    return response.data;
  },

  // Get rebuild progress
  getRebuildProgress: async (repositoryId: string, complexity = 2) => {
    const response = await apiClient.get<{
      repositoryId: string;
      complexity: number;
      totalSteps: number;
      completedSteps: number;
      progressPercentage: number;
      status: string;
      lastAccessed?: string;
    }>(`/repositories/${repositoryId}/rebuild-steps/progress?complexity=${complexity}`);
    return response.data;
  },

  // List rebuild guides
  listRebuildGuides: async (repositoryId: string) => {
    const response = await apiClient.get<{
      repositoryId: string;
      guides: Array<{
        complexity: number;
        totalSteps: number;
        createdAt: Date;
      }>;
      total: number;
    }>(`/repositories/${repositoryId}/rebuild-guides`);
    return response.data;
  },
};
