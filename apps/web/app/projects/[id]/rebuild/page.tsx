'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { repositoriesApi, RebuildGuide, RebuildStep } from '../../../../lib/api/repositories';
import Skeleton from '../../../../components/ui/skeleton';

interface StepCardProps {
  step: RebuildStep;
  isExpanded: boolean;
  onToggle: () => void;
  isActive: boolean;
  isCompleted: boolean;
}

function StepCard({ step, isExpanded, onToggle, isActive, isCompleted }: StepCardProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (step.codeTemplate) {
      highlightCode();
    }
  }, [step.codeTemplate]);

  useEffect(() => {
    if (isCompleted && !isAnimating) {
      setIsAnimating(true);
      // Reset animation after it completes
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [isCompleted]);

  const highlightCode = async () => {
    try {
      const ext = step.filePath.split('.').pop()?.toLowerCase();
      const lang = getLanguageFromExtension(ext || '');
      
      // Simple syntax highlighting using CSS classes
      const highlighted = step.codeTemplate
        .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
        .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
        .replace(/('.*?'|".*?")/g, '<span class="string">$&</span>')
        .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="boolean">$&</span>')
        .replace(/\b\d+\b/g, '<span class="number">$&</span>');
      
      setHighlightedCode(highlighted);
    } catch (error) {
      setHighlightedCode(step.codeTemplate);
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
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
    };

    return langMap[ext] || 'text';
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${
      isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200'
    } ${isCompleted ? 'bg-green-50 border-l-4 border-l-green-500' : 'bg-white'}`}>
      {/* Step Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              isCompleted
                ? 'bg-green-500 text-white'
                : isActive
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-600'
            } ${isAnimating ? 'scale-110' : ''}`}>
              {isCompleted ? (
                <svg 
                  className="w-5 h-5 animate-pulse" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                    className="animate-draw-check"
                  />
                </svg>
              ) : (
                step.order
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{step.filePath}</span>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Dependencies */}
          {step.dependencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Dependencies:</h4>
              <div className="flex flex-wrap gap-2">
                {step.dependencies.map((dep, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Code Template */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Code Template:</h4>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  style={{ 
                    color: '#f8f8f2',
                    fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                />
              </pre>
              <style jsx>{`
                .comment { color: #6272a4; font-style: italic; }
                .string { color: #a6e22e; }
                .keyword { color: #f92672; font-weight: bold; }
                .boolean { color: #ae81ff; }
                .number { color: #ae81ff; }
              `}</style>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Explanation:</h4>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {step.explanation}
            </div>
          </div>

          {/* Why This Matters */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Why This Matters:</h4>
            <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded">
              {step.whyThisMatters}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileStepper({ 
  steps, 
  currentStep, 
  onStepSelect, 
  onSwipe 
}: { 
  steps: RebuildStep[]; 
  currentStep: number; 
  onStepSelect: (step: number) => void; 
  onSwipe: (direction: 'left' | 'right') => void;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      onSwipe(diff > 0 ? 'left' : 'right');
    }

    setTouchStart(null);
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Steps</h3>
        <span className="text-sm text-gray-500">{currentStep} of {steps.length}</span>
      </div>
      <div 
        className="flex space-x-2 overflow-x-auto pb-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {steps.map((step, index) => (
          <button
            key={step.order}
            onClick={() => onStepSelect(step.order)}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              index + 1 === currentStep
                ? 'bg-blue-500 text-white'
                : index + 1 < currentStep
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
            aria-label={`Go to step ${step.order}`}
          >
            {index + 1 < currentStep ? '✓' : step.order}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Swipe to navigate between steps
      </div>
    </div>
  );
}

export default function RebuildGuidePage() {
  const params = useParams();
  const [guide, setGuide] = useState<RebuildGuide | null>(null);
  const [complexity, setComplexity] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const repositoryId = params.id as string;

  useEffect(() => {
    fetchRebuildGuide();
  }, [repositoryId, complexity]);

  useEffect(() => {
    if (currentStep && stepRefs.current[currentStep]) {
      stepRefs.current[currentStep]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  useEffect(() => {
    // Detect mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentStep < (guide?.totalSteps || 0)) {
      setCurrentStep(currentStep + 1);
    } else if (direction === 'right' && currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const fetchRebuildGuide = async () => {
    try {
      setLoading(true);
      const result = await repositoriesApi.getRebuildSteps(repositoryId, complexity);
      setGuide(result);
      setError(null);
      setCurrentStep(1);
      setExpandedSteps(new Set([1])); // Auto-expand first step
    } catch (err: any) {
      setError(err.message || 'Failed to generate rebuild guide');
      setGuide(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
    setCurrentStep(stepNumber);
  };

  const handleComplexityChange = (newComplexity: number) => {
    setComplexity(newComplexity);
  };

  const getComplexityLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Simple (5-10 steps)';
      case 2:
        return 'Detailed (15-25 steps)';
      case 3:
        return 'Complete (30+ steps)';
      default:
        return 'Unknown';
    }
  };

  const getProgressPercentage = () => {
    if (!guide) return 0;
    return Math.round((currentStep / guide.totalSteps) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Complexity Selector Skeleton */}
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded"></div>
        </div>

        {/* Steps Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchRebuildGuide}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No rebuild guide available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Complexity Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Rebuild Guide Complexity</h3>
            <p className="text-sm text-gray-600">Choose the level of detail for your rebuild guide</p>
          </div>
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => handleComplexityChange(level)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  complexity === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getComplexityLabel(level)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Progress</h3>
          <span className="text-sm text-gray-600">
            Step {currentStep} of {guide.totalSteps}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getProgressPercentage()}% complete
        </div>
      </div>

      {/* Mobile Stepper */}
      {isMobile && guide && (
        <MobileStepper
          steps={guide.steps}
          currentStep={currentStep}
          onStepSelect={setCurrentStep}
          onSwipe={handleSwipe}
        />
      )}

      {/* Steps */}
      <div className="space-y-4">
        {guide.steps.map((step) => (
          <div
            key={step.order}
            ref={(el) => (stepRefs.current[step.order] = el)}
          >
            <StepCard
              step={step}
              isExpanded={expandedSteps.has(step.order)}
              onToggle={() => toggleStep(step.order)}
              isActive={currentStep === step.order}
              isCompleted={step.order < currentStep}
            />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Step
        </button>
        
        <div className="text-sm text-gray-600">
          Generated on {new Date(guide.generatedAt).toLocaleDateString()}
        </div>
        
        <button
          onClick={() => setCurrentStep(Math.min(guide.totalSteps, currentStep + 1))}
          disabled={currentStep === guide.totalSteps}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step →
        </button>
      </div>
    </div>
  );
}
