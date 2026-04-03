import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextJest from '../../node_modules/next/jest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js para cargar next.config.mjs y los archivos .env en tu entorno de prueba
  dir: __dirname,
})

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// createJestConfig se exporta de esta manera para asegurar que next/jest pueda cargar la configuración de Next.js que es asíncrona
export default createJestConfig(customJestConfig)
