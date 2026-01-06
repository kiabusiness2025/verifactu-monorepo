"use client";

// v1.0.3 - Updated with blue shield favicon
import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";
import { useToast } from "./Toast";
import BrandLogo from "./BrandLogo";

type NavLink = { label: string; href: string };

export default function Header({ navLinks }: { navLinks?: NavLink[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const defaultNavLinks: NavLink[] = [
    { label: "Características", href: "#features" },
    { label: "Precios", href: "#planes" },
    { label: "FAQ", href: "#faq" },
    { label: "Docs", href: "/proximamente" },
  ];

  const links = navLinks ?? defaultNavLinks;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <BrandLogo variant="header" />

        {/* Version marker */}
        <span className="hidden md:inline text-xs text-gray-500">v1.0.3</span>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Side - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <button
              onClick={async () => {
                await logout();
                showToast({ type: "success", title: "Sesión cerrada", message: "Has salido correctamente" });
              }}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all text-sm"
            >
              Acceder
            </Link>
          )}
        </div>

        {/* Mobile: Hamburger Menu Button + Login Button */}
        <div className="md:hidden flex items-center gap-3">
          <span className="text-xs text-gray-500">v1.0.3</span>
          {user ? (
            <button
              onClick={async () => {
                await logout();
                showToast({ type: "success", title: "Sesión cerrada", message: "Has salido correctamente" });
              }}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all text-sm"
            >
              Acceder
            </Link>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-gray-900" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <nav className="flex flex-col py-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

