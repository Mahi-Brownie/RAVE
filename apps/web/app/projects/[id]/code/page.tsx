'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { repositoriesApi, FileNode, FileContent } from '../../../../lib/api/repositories';
import { highlighter } from 'shiki';
import Skeleton from '../../../../components/ui/skeleton';

interface FileTreeProps {
  files: FileNode[];
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  loading?: boolean;
}

function FileTree({ files, selectedFile, onFileSelect, loading }: FileTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const getFileIcon = (fileName: string, type: 'file' | 'directory') => {
    if (type === 'directory') {
      return '📁';
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'ts': '📘',
      'tsx': '📘',
      'js': '📗',
      'jsx': '📗',
      'py': '🐍',
      'go': '🐹',
      'rs': '🦀',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'cs': '🔷',
      'php': '🐘',
      'rb': '💎',
      'swift': '🍎',
      'kt': '🎯',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'xml': '📄',
      'yaml': '📄',
      'yml': '📄',
      'md': '📝',
      'txt': '📄',
      'gitignore': '🚫',
      'env': '🔧',
      'dockerfile': '🐳',
    };

    return iconMap[ext || ''] || '📄';
  };

  const renderNode = (node: FileNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedFile === node.path;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded ${
            isSelected ? 'bg-blue-100' : ''
          }`}
          onClick={() => {
            if (node.type === 'directory') {
              toggleNode(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          <span className="mr-2 text-sm">
            {node.type === 'directory' ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name, node.type)}
          </span>
          <span className="text-sm truncate flex-1">{node.name}</span>
          {node.type === 'file' && node.size && (
            <span className="text-xs text-gray-500 ml-2">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>
        {node.type === 'directory' && isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto border-r border-gray-200">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Files</h3>
        <div className="space-y-1">
          {files.map((file) => renderNode(file))}
        </div>
      </div>
    </div>
  );
}

interface CodeViewerProps {
  content: string;
  filePath: string;
  loading?: boolean;
}

function CodeViewer({ content, filePath, loading }: CodeViewerProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (content) {
      highlightCode();
    }
  }, [content, filePath]);

  const highlightCode = async () => {
    try {
      const ext = filePath.split('.').pop()?.toLowerCase();
      const lang = getLanguageFromExtension(ext || '');
      
      const result = await highlighter.codeToHtml(content, {
        lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      });
      
      setHighlightedCode(result);
    } catch (error) {
      // Fallback to plain text
      setHighlightedCode(`<pre><code>${content}</code></pre>`);
    }
  };

  const getLanguageFromExtension = (ext: string) => {
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'bash',
      'sql': 'sql',
    };

    return langMap[ext] || 'text';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{filePath}</h3>
          <p className="text-xs text-gray-500">{content.length} characters</p>
        </div>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <div
          className="h-full"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>
    </div>
  );
}

interface ExplanationPanelProps {
  repositoryId: string;
  filePath: string;
  loading?: boolean;
}

function ExplanationPanel({ repositoryId, filePath, loading }: ExplanationPanelProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [depth, setDepth] = useState(3);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filePath) {
      fetchExplanation();
    }
  }, [filePath, depth]);

  const fetchExplanation = async () => {
    try {
      setLoadingExplanation(true);
      setError(null);
      const result = await repositoriesApi.getExplanation(repositoryId, filePath, depth);
      setExplanation(result.explanation);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
      setExplanation('');
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 border-t border-gray-200 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 border-t border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">AI Explanation</h3>
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-500">Depth:</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value={1}>Simple</option>
              <option value={2}>Detailed</option>
              <option value={3}>Expert</option>
              <option value={4}>Analysis</option>
              <option value={5}>Critique</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">{filePath}</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loadingExplanation ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : explanation ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{explanation}</div>
        ) : (
          <div className="text-sm text-gray-500">Select a file to get AI explanation</div>
        )}
      </div>
    </div>
  );
}

function MobileBottomSheet({ files, selectedFile, onFileSelect, loading }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Tab bar trigger */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center space-x-2 text-blue-600 font-medium"
        >
          <span>📁</span>
          <span>File Explorer</span>
          <span className="text-sm text-gray-500">({files.length} files)</span>
        </button>
      </div>

      {/* Bottom sheet */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sheet content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Files</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* File tree */}
            <div className="flex-1 overflow-auto p-4">
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onFileSelect={(filePath) => {
                  onFileSelect(filePath);
                  setIsOpen(false); // Close sheet after selection
                }}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CodeExplorer() {
  const params = useParams();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const repositoryId = params.id as string;

  useEffect(() => {
    // Detect mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [repositoryId]);

  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile);
    }
  }, [selectedFile]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const result = await repositoriesApi.getFiles(repositoryId);
      setFiles(result.files);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (filePath: string) => {
    try {
      const result = await repositoriesApi.getFileContent(repositoryId, filePath);
      setFileContent(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch file content');
      setFileContent(null);
    }
  };

  return (
    <div className="h-full">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="h-full flex">
        {/* File Tree - Desktop */}
        {!isMobile && (
          <div className="w-80 h-full bg-white">
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              loading={loading}
            />
          </div>
        )}

        {/* Code Viewer and Explanation */}
        <div className="flex-1 flex flex-col">
          <CodeViewer
            content={fileContent?.content || ''}
            filePath={selectedFile || ''}
            loading={!fileContent && !!selectedFile}
          />
          
          {selectedFile && (
            <ExplanationPanel
              repositoryId={repositoryId}
              filePath={selectedFile}
              loading={false}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet
        files={files}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        loading={loading}
      />
    </div>
  );
}
