'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { repositoriesApi, DependencyGraph } from '../../../../lib/api/repositories';

interface DependencyGraphProps {
  graph: DependencyGraph;
  onNodeClick?: (node: NodeSingular) => void;
}

function DependencyGraphVisualization({ graph, onNodeClick }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<NodeSingular | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  useEffect(() => {
    if (containerRef.current && graph) {
      initializeCytoscape();
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graph]);

  useEffect(() => {
    if (cyRef.current && searchTerm) {
      searchNodes(searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    // Detect mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!cyRef.current) return;

    if (e.touches.length === 1 && touchStart) {
      // Pan gesture
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      
      cyRef.current.panBy({ x: -deltaX, y: -deltaY });
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch zoom gesture
      const currentDistance = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      
      const scale = currentDistance / lastTouchDistance;
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom * scale);
      
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setLastTouchDistance(null);
  };

  const initializeCytoscape = () => {
    if (!containerRef.current) return;

    const elements = [
      ...graph.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          ...node.data,
        },
      })),
      ...graph.edges.map(edge => ({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          ...edge.data,
        },
      })),
    ];

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (node: NodeSingular) => getNodeColor(node.data('type')),
            'border-color': '#333',
            'border-width': 1,
            'color': '#fff',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': '30px',
            'height': '30px',
            'label': (node: NodeSingular) => node.data('label'),
            'text-outline-color': '#000',
            'text-outline-width': 2,
            'text-outline-opacity': 1,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#ff6b6b',
            'border-width': 3,
            'border-color': '#ff3333',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': (edge: EdgeSingular) => getEdgeColor(edge.data('type')),
            'target-arrow-color': (edge: EdgeSingular) => getEdgeColor(edge.data('type')),
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.8,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'width': 4,
            'line-color': '#ff6b6b',
            'target-arrow-color': '#ff6b6b',
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
    });

    // Event handlers
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      setSelectedNode(node);
      onNodeClick?.(node);
      
      // Highlight connected edges
      cyRef.current!.elements().removeClass('highlighted');
      node.neighborhood().addClass('highlighted');
    });

    cyRef.current.on('tap', (event) => {
      if (event.target === cyRef.current) {
        setSelectedNode(null);
        cyRef.current!.elements().removeClass('highlighted');
      }
    });

    // Add highlight style
    cyRef.current.style()
      .selector('.highlighted')
      .style({
        'opacity': 1,
        'z-index': 10,
      })
      .update();
  };

  const getNodeColor = (type: string) => {
    const colors = {
      file: '#4a90e2',
      package: '#f39c12',
      external: '#e74c3c',
    };
    return colors[type] || '#95a5a6';
  };

  const getEdgeColor = (type: string) => {
    const colors = {
      import: '#27ae60',
      export: '#8e44ad',
      require: '#e67e22',
    };
    return colors[type] || '#7f8c8d';
  };

  const searchNodes = (term: string) => {
    if (!cyRef.current) return;

    cyRef.current.elements().removeClass('search-highlight');
    
    if (term.trim()) {
      const matchingNodes = cyRef.current.nodes().filter((node: any) => {
        const label = node.data('label')?.toLowerCase() || '';
        const path = node.data('path')?.toLowerCase() || '';
        return label.includes(term.toLowerCase()) || path.includes(term.toLowerCase());
      });

      matchingNodes.addClass('search-highlight');
      matchingNodes.select();

      // Fit to matching nodes
      if (matchingNodes.length > 0) {
        cyRef.current.fit(matchingNodes, 50);
      }
    }
  };

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 50);
  };

  const handleReset = () => {
    cyRef.current?.reset();
  };

  const MobileLegend = () => {
  return (
    <div className="md:hidden bg-white border-t border-gray-200 p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
      <div className="flex space-x-4 overflow-x-auto pb-2">
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-4 h-4 rounded-full bg-blue-500 mb-1"></div>
          <span className="text-xs text-gray-600">Files</span>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-4 h-4 rounded-full bg-yellow-500 mb-1"></div>
          <span className="text-xs text-gray-600">Packages</span>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-4 h-4 rounded-full bg-red-500 mb-1"></div>
          <span className="text-xs text-gray-600">External</span>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-8 h-0.5 bg-green-500 mb-1"></div>
          <span className="text-xs text-gray-600">Import</span>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-8 h-0.5 bg-purple-500 mb-1"></div>
          <span className="text-xs text-gray-600">Export</span>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div className="w-8 h-0.5 bg-orange-500 mb-1"></div>
          <span className="text-xs text-gray-600">Require</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Pinch to zoom, drag to pan
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dependency Graph</h3>
          {!isMobile && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomIn}
                className="p-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                title="Zoom In"
                aria-label="Zoom in"
              >
                🔍+
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                🔍-
              </button>
              <button
                onClick={handleFit}
                className="p-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                title="Fit to View"
                aria-label="Fit to view"
              >
                ⬜
              </button>
              <button
                onClick={handleReset}
                className="p-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                title="Reset"
                aria-label="Reset view"
              >
                🔄
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search nodes"
          />
          <div className="text-sm text-gray-500">
            {graph.nodes.length} nodes, {graph.edges.length} edges
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 relative">
        <div 
          ref={containerRef} 
          className="w-full h-full" 
          style={{ minHeight: '500px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {/* Desktop Legend */}
        {!isMobile && (
          <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Files</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-600">Packages</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">External</span>
              </div>
              <div className="border-t pt-1 mt-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-green-500"></div>
                  <span className="text-xs text-gray-600">Import</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-purple-500"></div>
                  <span className="text-xs text-gray-600">Export</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-orange-500"></div>
                  <span className="text-xs text-gray-600">Require</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node Info Panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {selectedNode.data('label')}
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>
                <span className="font-medium">Type:</span> {selectedNode.data('type')}
              </div>
              {selectedNode.data('path') && (
                <div>
                  <span className="font-medium">Path:</span> {selectedNode.data('path')}
                </div>
              )}
              {selectedNode.data('language') && (
                <div>
                  <span className="font-medium">Language:</span> {selectedNode.data('language')}
                </div>
              )}
              {selectedNode.data('size') && (
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(selectedNode.data('size'))}
                </div>
              )}
              <div>
                <span className="font-medium">Connections:</span>{' '}
                {selectedNode.degree()} ({selectedNode.connectedEdges().length} edges)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Legend */}
      <MobileLegend />
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DependenciesPage() {
  const params = useParams();
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repositoryId = params.id as string;

  useEffect(() => {
    fetchDependencyGraph();
  }, [repositoryId]);

  const fetchDependencyGraph = async () => {
    try {
      setLoading(true);
      const result = await repositoriesApi.getDependencies(repositoryId);
      setGraph(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dependency graph');
      setGraph(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating dependency graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDependencyGraph}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No dependency graph available</p>
        </div>
      </div>
    );
  }

  return <DependencyGraphVisualization graph={graph} />;
}
