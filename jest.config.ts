import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@heroui/react$': '<rootDir>/src/__mocks__/heroui-react.tsx',
    '^@phosphor-icons/react$': '<rootDir>/src/__mocks__/phosphor-icons-react.tsx',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@heroui|@phosphor-icons|lucide-react)/)',
  ],
};

export default createJestConfig(config);
