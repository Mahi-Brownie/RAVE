'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Step {
  id: number;
  title: string;
  description: string;
  illustration: string;
  action: string;
  skipLabel?: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Welcome to RAYE',
    description: 'Your intelligent code analysis platform. Understand, explore, and rebuild any project with AI-powered insights.',
    illustration: '🚀',
    action: 'Get Started',
    skipLabel: 'Skip Tutorial',
  },
  {
    id: 2,
    title: 'Import Your First Repository',
    description: 'Clone and analyze any GitHub repository. We\'ll extract dependencies, generate explanations, and create rebuild guides automatically.',
    illustration: '📁',
    action: 'Import Repository',
    skipLabel: 'Skip',
  },
  {
    id: 3,
    title: 'Explore with AI',
    description: 'Get code explanations at 5 depth levels, visualize dependencies, and follow step-by-step rebuild guides. Learning made interactive.',
    illustration: '🤖',
    action: 'Start Exploring',
    skipLabel: 'Skip',
  },
];

export default function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const handleImportRepository = () => {
    handleComplete();
    router.push('/dashboard');
    // Trigger import dialog - this would be handled by the dashboard component
  };

  const handleAction = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 1:
        handleNext();
        break;
      case 2:
        handleImportRepository();
        break;
      case 3:
        handleComplete();
        break;
      default:
        handleNext();
    }
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close onboarding"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          {/* Illustration */}
          <div className="text-6xl mb-6 animate-bounce">{step.illustration}</div>
          
          {/* Title and description */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h2>
          <p className="text-gray-600 leading-relaxed">{step.description}</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAction}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {step.action}
          </button>
          
          {step.skipLabel && (
            <button
              onClick={handleSkip}
              className="w-full text-gray-500 py-2 px-4 font-medium hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {step.skipLabel}
            </button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-blue-600'
                  : index < currentStep
                  ? 'bg-blue-300'
                  : 'bg-gray-300'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
