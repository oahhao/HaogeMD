import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { globalEvents } from '@/utils/globalEvents';

// Mock child component that throws error
const ErrorThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear all mock states and event listeners
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should show error UI when child throws error', () => {
    // Mock console.error to avoid test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('出了点问题')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('should trigger global events on retry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockEmit = vi.spyOn(globalEvents, 'emit');
    
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Click retry button
    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);
    
    // Should emit global events
    expect(mockEmit).toHaveBeenCalledWith('reload-images');
    expect(mockEmit).toHaveBeenCalledWith('clear-cache');
  });

  it('should reset error state after retry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock console.log to track what's happening
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('出了点问题')).toBeInTheDocument();
    
    // Click retry button
    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);
    
    // Rerender without error
    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    expect(consoleLogSpy).toHaveBeenCalled(); // Should log the retry action
  });
});