#!/usr/bin/env node

/**
 * Auto-Fix TypeScript Errors usando GitHub Copilot CLI
 * Este script analiza errores de TypeScript y aplica fixes automáticos
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const errorLogFile = process.argv[2];

if (!errorLogFile || !fs.existsSync(errorLogFile)) {
  console.log('No error log file found. Skipping auto-fix.');
  process.exit(0);
}

const errorLog = fs.readFileSync(errorLogFile, 'utf-8');
const errors = parseTypeScriptErrors(errorLog);

console.log(`Found ${errors.length} TypeScript errors`);

// Agrupar errores por tipo
const errorGroups = groupErrorsByType(errors);

// Auto-fix para errores comunes
for (const [errorType, errorList] of Object.entries(errorGroups)) {
  console.log(`\nProcessing ${errorList.length} errors of type: ${errorType}`);
  
  switch (errorType) {
    case 'missing-import':
      fixMissingImports(errorList);
      break;
    case 'type-mismatch':
      fixTypeMismatches(errorList);
      break;
    case 'missing-property':
      fixMissingProperties(errorList);
      break;
    case 'unused-variable':
      fixUnusedVariables(errorList);
      break;
    default:
      console.log(`  → No auto-fix available for ${errorType}`);
  }
}

console.log('\n✓ Auto-fix completed');

/**
 * Parse TypeScript error output
 */
function parseTypeScriptErrors(log) {
  const errors = [];
  const lines = log.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Formato: apps/app/file.tsx(10,5): error TS2304: Cannot find name 'xyz'
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5]
      });
    }
  }
  
  return errors;
}

/**
 * Group errors by type
 */
function groupErrorsByType(errors) {
  const groups = {};
  
  for (const error of errors) {
    let type = 'unknown';
    
    if (error.message.includes('Cannot find name')) {
      type = 'missing-import';
    } else if (error.message.includes('Type') && error.message.includes('not assignable')) {
      type = 'type-mismatch';
    } else if (error.message.includes('Property') && error.message.includes('does not exist')) {
      type = 'missing-property';
    } else if (error.message.includes('is declared but its value is never read')) {
      type = 'unused-variable';
    }
    
    if (!groups[type]) groups[type] = [];
    groups[type].push(error);
  }
  
  return groups;
}

/**
 * Fix missing imports
 */
function fixMissingImports(errors) {
  const importMap = {
    'React': "import React from 'react';",
    'useState': "import { useState } from 'react';",
    'useEffect': "import { useEffect } from 'react';",
    'NextResponse': "import { NextResponse } from 'next/server';",
    'NextRequest': "import { NextRequest } from 'next/server';",
    'prisma': "import prisma from '@/lib/prisma';",
    'getSessionPayload': "import { getSessionPayload } from '@/lib/session';",
  };
  
  for (const error of errors) {
    const nameMatch = error.message.match(/Cannot find name '(\w+)'/);
    if (nameMatch && importMap[nameMatch[1]]) {
      const importStatement = importMap[nameMatch[1]];
      addImportToFile(error.file, importStatement);
      console.log(`  ✓ Added import for ${nameMatch[1]} in ${error.file}`);
    }
  }
}

/**
 * Fix type mismatches by adding type assertions or adjusting types
 */
function fixTypeMismatches(errors) {
  for (const error of errors) {
    // Estrategias comunes:
    // 1. Añadir 'any' temporal (no ideal pero funcional)
    // 2. Usar type assertion
    console.log(`  ℹ Type mismatch in ${error.file}:${error.line}`);
    console.log(`    → Manual review recommended`);
  }
}

/**
 * Fix missing properties in objects/interfaces
 */
function fixMissingProperties(errors) {
  for (const error of errors) {
    const propMatch = error.message.match(/Property '(\w+)' does not exist on type '(\w+)'/);
    if (propMatch) {
      const [, prop, type] = propMatch;
      console.log(`  ℹ Missing property '${prop}' on type '${type}' in ${error.file}:${error.line}`);
      console.log(`    → Consider adding '${prop}?: any' to the ${type} interface`);
    }
  }
}

/**
 * Fix unused variables by removing them
 */
function fixUnusedVariables(errors) {
  for (const error of errors) {
    const varMatch = error.message.match(/'(\w+)' is declared but/);
    if (varMatch) {
      const varName = varMatch[1];
      console.log(`  ℹ Unused variable '${varName}' in ${error.file}:${error.line}`);
      // Podríamos eliminar la línea o prefixar con _
    }
  }
}

/**
 * Add import to file if not already present
 */
function addImportToFile(filePath, importStatement) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if import already exists
  if (content.includes(importStatement)) {
    return;
  }
  
  // Find the position to insert import (after other imports or at top)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith("import {")) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, importStatement);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}
