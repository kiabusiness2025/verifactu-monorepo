'use client';

// v1.0.3 - Updated with blue shield favicon
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { logout } from '../lib/auth';
import { useToast } from './Toast';
import BrandLogo from './BrandLogo';
import { DashboardLink } from './DashboardLink';

type NavLink = { label: string; href: string };

export default function Header({ navLinks }: { navLinks?: NavLink[] }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const defaultNavLinks: NavLink[] = [
    { label: 'VeriFactu', href: '/verifactu/que-es' },
    { label: 'Calcula tu precio', href: '/#precios' },
    { label: 'Recursos', href: '/recursos/guias-y-webinars' },
    { label: 'Soporte', href: '/verifactu/soporte' },
  ];

  const links = navLinks ?? defaultNavLinks;

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <BrandLogo variant="header" />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegacion principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-lightbg-600 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <DashboardLink />
              <button
                onClick={async () => {
                  await logout();
                  showToast({
                    type: 'success',
                    title: 'Sesion cerrada',
                    message: 'Has salido correctamente',
                  });
                }}
                className="rounded-lg bg-slate-700 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                aria-label="Cerrar sesion"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full bg-[#2361d8] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1f55c0]"
              aria-label="Acceder a tu cuenta"
            >
              Acceder
            </Link>
          )}
        </div>

        {/* Mobile: Hamburger Menu Button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label={isOpen ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-gray-900" />
            ) : (
              <Menu className="h-6 w-6 text-gray-900" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            id="mobile-menu"
            className="border-t border-gray-200 bg-white md:hidden"
          >
            <nav className="flex flex-col gap-3 px-4 py-4">
              {user ? (
                <>
                  <DashboardLink
                    className="w-full justify-center rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#1f55c0]"
                    ariaLabel="Ir al Dashboard"
                  />
                  <button
                    onClick={async () => {
                      await logout();
                      showToast({
                        type: 'success',
                        title: 'Sesion cerrada',
                        message: 'Has salido correctamente',
                      });
                      setIsOpen(false);
                    }}
                    className="w-full rounded-full border border-[#2361d8] px-4 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                    aria-label="Cerrar sesion"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-full bg-[#2361d8] px-4 py-2 text-center text-sm font-semibold text-white shadow-md hover:bg-[#1f55c0]"
                  aria-label="Acceder a tu cuenta"
                >
                  Acceder
                </Link>
              )}
              <div className="h-px bg-gray-200" />
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#2361d8]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
