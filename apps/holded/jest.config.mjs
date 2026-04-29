import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextJest from '../../node_modules/next/jest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createJestConfig = nextJest({ dir: __dirname });

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(jose|@verifactu|@prisma)/)'],
};

export default createJestConfig(customJestConfig);
