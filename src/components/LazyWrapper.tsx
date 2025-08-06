import React, { Suspense } from 'react';

interface LazyWrapperProps {
  children: React.ReactNode;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="relative">
      <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-8 h-8 sm:w-12 sm:h-12 border-4 border-transparent border-t-orange-500 rounded-full animate-spin animation-delay-150"></div>
    </div>
  </div>
);

const LazyWrapper: React.FC<LazyWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper; 