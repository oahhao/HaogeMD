import { describe, it, expect, vi, beforeEach } from 'vitest';
import { globalEvents } from '@/utils/globalEvents';

describe('GlobalEventManager', () => {
  beforeEach(() => {
    // Clear all event listeners before each test
    globalEvents.clear();
  });

  it('should subscribe to events', () => {
    const handler = vi.fn();
    
    globalEvents.subscribe('reload-images', handler);
    
    globalEvents.emit('reload-images');
    
    expect(handler).toHaveBeenCalled();
  });

  it('should unsubscribe from events', () => {
    const handler = vi.fn();
    
    const unsubscribe = globalEvents.subscribe('reload-images', handler);
    
    globalEvents.emit('reload-images');
    expect(handler).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    
    globalEvents.emit('reload-images');
    expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should support multiple subscribers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    globalEvents.subscribe('reload-images', handler1);
    globalEvents.subscribe('reload-images', handler2);
    
    globalEvents.emit('reload-images');
    
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should pass data to event handlers', () => {
    const handler = vi.fn();
    
    globalEvents.subscribe('reload-images', handler);
    
    const testData = { imageId: 'test123' };
    globalEvents.emit('reload-images', testData);
    
    expect(handler).toHaveBeenCalledWith(testData);
  });

  it('should handle different event types', () => {
    const reloadHandler = vi.fn();
    const clearCacheHandler = vi.fn();
    
    globalEvents.subscribe('reload-images', reloadHandler);
    globalEvents.subscribe('clear-cache', clearCacheHandler);
    
    globalEvents.emit('reload-images');
    
    expect(reloadHandler).toHaveBeenCalled();
    expect(clearCacheHandler).not.toHaveBeenCalled();
    
    globalEvents.emit('clear-cache');
    
    expect(clearCacheHandler).toHaveBeenCalled();
  });

  it('should handle errors in handlers gracefully', () => {
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const normalHandler = vi.fn();
    
    // Mock console.error to avoid test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    globalEvents.subscribe('reload-images', errorHandler);
    globalEvents.subscribe('reload-images', normalHandler);
    
    // Should not throw, and should continue to call other handlers
    expect(() => globalEvents.emit('reload-images')).not.toThrow();
    
    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalled();
  });

  it('should clear all event listeners', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    globalEvents.subscribe('reload-images', handler1);
    globalEvents.subscribe('clear-cache', handler2);
    
    globalEvents.clear();
    
    globalEvents.emit('reload-images');
    globalEvents.emit('clear-cache');
    
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});