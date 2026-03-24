import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Runs after each test case (e.g., clearing the DOM)
afterEach(() => {
  cleanup();
});
