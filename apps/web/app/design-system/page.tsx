'use client';

import { useState } from 'react';

// Development-only guard - this page should only be accessible in development
if (process.env.NODE_ENV === 'production') {
  throw new Error('Design system documentation is only available in development mode');
}

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState('colors');

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'shadows', label: 'Shadows' },
    { id: 'components', label: 'Components' },
  ];

  const colors = {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  };

  const typography = {
    display: {
      name: 'Display',
      size: 'text-4xl sm:text-5xl lg:text-6xl',
      weight: 'font-bold',
      lineHeight: 'leading-none',
      description: 'Hero headings and large titles',
    },
    h1: {
      name: 'Heading 1',
      size: 'text-3xl sm:text-4xl',
      weight: 'font-bold',
      lineHeight: 'leading-tight',
      description: 'Page titles and main headings',
    },
    h2: {
      name: 'Heading 2',
      size: 'text-2xl sm:text-3xl',
      weight: 'font-bold',
      lineHeight: 'leading-tight',
      description: 'Section headings',
    },
    h3: {
      name: 'Heading 3',
      size: 'text-xl sm:text-2xl',
      weight: 'font-semibold',
      lineHeight: 'leading-tight',
      description: 'Subsection headings',
    },
    h4: {
      name: 'Heading 4',
      size: 'text-lg sm:text-xl',
      weight: 'font-semibold',
      lineHeight: 'leading-tight',
      description: 'Card titles and small headings',
    },
    body: {
      name: 'Body',
      size: 'text-base',
      weight: 'font-normal',
      lineHeight: 'leading-relaxed',
      description: 'Regular paragraph text',
    },
    small: {
      name: 'Small',
      size: 'text-sm',
      weight: 'font-normal',
      lineHeight: 'leading-relaxed',
      description: 'Supporting text and captions',
    },
    xs: {
      name: 'Extra Small',
      size: 'text-xs',
      weight: 'font-normal',
      lineHeight: 'leading-relaxed',
      description: 'Fine print and labels',
    },
  };

  const spacing = {
    0: '0px',
    1: '0.25rem (4px)',
    2: '0.5rem (8px)',
    3: '0.75rem (12px)',
    4: '1rem (16px)',
    5: '1.25rem (20px)',
    6: '1.5rem (24px)',
    8: '2rem (32px)',
    10: '2.5rem (40px)',
    12: '3rem (48px)',
    16: '4rem (64px)',
    20: '5rem (80px)',
    24: '6rem (96px)',
    32: '8rem (128px)',
    40: '10rem (160px)',
    48: '12rem (192px)',
    56: '14rem (224px)',
    64: '16rem (256px)',
  };

  const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  };

  const ColorPalette = ({ colors, name }: { colors: any; name: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Object.entries(colors).map(([key, value]: any) => (
          <div key={key} className="text-center">
            <div
              className="h-16 rounded-lg mb-2 border border-gray-200"
              style={{ backgroundColor: value }}
            />
            <div className="text-xs text-gray-600">
              <div className="font-medium">{key}</div>
              <div>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TypographyScale = () => (
    <div className="space-y-6">
      {Object.entries(typography).map(([key, config]: any) => (
        <div key={key} className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{config.size}</code>
          </div>
          <div className={`${config.size} ${config.weight} ${config.lineHeight} text-gray-900`}>
            The quick brown fox jumps over the lazy dog
          </div>
          <p className="text-sm text-gray-600 mt-2">{config.description}</p>
        </div>
      ))}
    </div>
  );

  const SpacingScale = () => (
    <div className="space-y-4">
      {Object.entries(spacing).map(([key, value]) => (
        <div key={key} className="flex items-center space-x-4">
          <div className="w-16 text-sm font-medium text-gray-600">{key}</div>
          <div className="flex-1">
            <div className="text-sm text-gray-900">{value}</div>
            <div className={`bg-blue-500 h-4 rounded`} style={{ width: value }}></div>
          </div>
        </div>
      ))}
    </div>
  );

  const ShadowScale = () => (
    <div className="space-y-6">
      {Object.entries(shadows).map(([key, value]) => (
        <div key={key} className="flex items-center space-x-4">
          <div className="w-20 text-sm font-medium text-gray-600">{key}</div>
          <div className="flex-1">
            <div
              className="w-24 h-24 bg-white rounded-lg border border-gray-200"
              style={{ boxShadow: value }}
            />
            <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
              {value}
            </code>
          </div>
        </div>
      ))}
    </div>
  );

  const ComponentShowcase = () => (
    <div className="space-y-8">
      {/* Buttons */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Buttons</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Primary Button
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Secondary Button
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Ghost Button
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500">
              Small Button
            </button>
            <button className="px-6 py-3 bg-red-500 text-white rounded-md text-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
              Large Button
            </button>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Inputs</h3>
        <div className="space-y-4 max-w-md">
          <input
            type="text"
            placeholder="Text input"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email input"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <textarea
            placeholder="Textarea"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Cards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Card Title</h4>
            <p className="text-gray-600">Card description with some content to show how it looks.</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Card with Border</h4>
            <p className="text-gray-600">Card with border and stronger shadow.</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h4 className="text-lg font-medium mb-2">Gradient Card</h4>
            <p className="opacity-90">Card with gradient background.</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Blue</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Green</span>
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Red</span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Yellow</span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Gray</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">Medium</span>
          <span className="px-4 py-2 bg-indigo-100 text-indigo-800 font-medium rounded-full">Large</span>
        </div>
      </div>

      {/* Skeleton Component */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skeleton Loading States</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Design System</h1>
          <p className="text-gray-600">RAYE Design System - Development Documentation Only</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === 'colors' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Color Palette</h2>
              <ColorPalette colors={colors.primary} name="Primary (Blue)" />
              <ColorPalette colors={colors.gray} name="Neutral (Gray)" />
              <ColorPalette colors={colors.success} name="Success (Green)" />
              <ColorPalette colors={colors.error} name="Error (Red)" />
            </div>
          )}

          {activeTab === 'typography' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Typography Scale</h2>
              <TypographyScale />
            </div>
          )}

          {activeTab === 'spacing' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Spacing Scale</h2>
              <SpacingScale />
            </div>
          )}

          {activeTab === 'shadows' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Shadow Scale</h2>
              <ShadowScale />
            </div>
          )}

          {activeTab === 'components' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Component Showcase</h2>
              <ComponentShowcase />
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Development Guidelines</h3>
          <ul className="text-yellow-700 space-y-1 text-sm">
            <li>• Use these tokens consistently across the application</li>
            <li>• Prefer semantic naming (primary, success, error) over arbitrary colors</li>
            <li>• Maintain proper contrast ratios for accessibility (WCAG AA)</li>
            <li>• Use focus-visible states for keyboard navigation</li>
            <li>• Test components across different screen sizes</li>
            <li>• This page is only accessible in development mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
