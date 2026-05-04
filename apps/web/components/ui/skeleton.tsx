interface SkeletonProps {
  variant?: 'text' | 'card' | 'code-block' | 'graph' | 'circle' | 'avatar';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 3,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  const combinedClasses = `${baseClasses} ${className}`;

  switch (variant) {
    case 'text':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`${baseClasses} h-4 ${
                index === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
              style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
              }}
            />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={`${combinedClasses} p-4`} style={{ width, height }}>
          <div className="space-y-3">
            <div className={`${baseClasses} h-6 w-3/4 rounded`}></div>
            <div className={`${baseClasses} h-4 w-full rounded`}></div>
            <div className={`${baseClasses} h-4 w-5/6 rounded`}></div>
          </div>
        </div>
      );

    case 'code-block':
      return (
        <div className={`${combinedClasses} font-mono text-sm p-4`} style={{ width, height }}>
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <div
                key={index}
                className={`${baseClasses} h-4`}
                style={{
                  width: `${Math.random() * 40 + 60}%`, // Random width for code lines
                }}
              />
            ))}
          </div>
        </div>
      );

    case 'graph':
      return (
        <div
          className={`${combinedClasses} relative overflow-hidden`}
          style={{ width: width || '100%', height: height || '400px' }}
        >
          {/* Simulate graph nodes */}
          <div className="absolute inset-0">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className={`${baseClasses} rounded-full absolute`}
                style={{
                  width: '30px',
                  height: '30px',
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 80 + 10}%`,
                }}
              />
            ))}
          </div>
        </div>
      );

    case 'circle':
      return (
        <div
          className={`${combinedClasses}`}
          style={{
            width: width || '40px',
            height: height || '40px',
            borderRadius: '50%',
          }}
        />
      );

    case 'avatar':
      return (
        <div
          className={`${combinedClasses}`}
          style={{
            width: width || '48px',
            height: height || '48px',
            borderRadius: '50%',
          }}
        />
      );

    default:
      return (
        <div
          className={combinedClasses}
          style={{ width, height }}
        />
      );
  }
}
