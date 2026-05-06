-- Migration: add HOLDED_DIRECT to AuthProvider enum
-- Phase 1 of holded-direct auth implementation
-- Date: 2026-05-06

ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'HOLDED_DIRECT';
