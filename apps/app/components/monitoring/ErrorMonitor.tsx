"use client";

import { useEffect, useRef } from 'react';

type ErrorReport = {
  type: 'broken_image' | 'broken_link' | 'empty_button' | 'slow_load' | 'console_error';
  details: any;
  url: string;
  timestamp: string;
  screenshot?: string;
};

export function ErrorMonitor() {
  const errorQueue = useRef<ErrorReport[]>([]);
  const reportTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Detectar imágenes rotas
    const checkBrokenImages = () => {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.complete || img.naturalHeight === 0) {
          reportError({
            type: 'broken_image',
            details: {
              src: img.src,
              alt: img.alt,
              element: img.outerHTML.substring(0, 200)
            },
            url: window.location.href,
            timestamp: new Date().toISOString()
          });
        }
      });
    };

    // Detectar enlaces rotos (verificar al hacer click)
    const checkBrokenLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        // Verificar si es un enlace interno roto
        if (link.href.startsWith(window.location.origin)) {
          fetch(link.href, { method: 'HEAD' }).catch(() => {
            reportError({
              type: 'broken_link',
              details: {
                href: link.href,
                text: link.textContent,
                element: link.outerHTML.substring(0, 200)
              },
              url: window.location.href,
              timestamp: new Date().toISOString()
            });
          });
        }
      }
    };

    // Detectar botones vacíos o sin contenido
    const checkEmptyButtons = () => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach((btn) => {
        const text = btn.textContent?.trim();
        const hasIcon = btn.querySelector('svg, img');
        
        if (!text && !hasIcon && btn.children.length === 0) {
          reportError({
            type: 'empty_button',
            details: {
              element: btn.outerHTML.substring(0, 200),
              classes: btn.className
            },
            url: window.location.href,
            timestamp: new Date().toISOString()
          });
        }
      });
    };

    // Detectar carga lenta
    const slowLoadThreshold = 5000; // 5 segundos
    const loadStart = performance.now();
    
    const checkSlowLoad = () => {
      const loadTime = performance.now() - loadStart;
      if (loadTime > slowLoadThreshold) {
        reportError({
          type: 'slow_load',
          details: {
            loadTime: Math.round(loadTime),
            threshold: slowLoadThreshold,
            resources: performance.getEntriesByType('resource').length
          },
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Capturar errores de consola
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      reportError({
        type: 'console_error',
        details: {
          message: args.join(' '),
          args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
        },
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      originalConsoleError.apply(console, args);
    };

    // Ejecutar checks
    const runChecks = () => {
      checkBrokenImages();
      checkEmptyButtons();
      checkSlowLoad();
    };

    // Ejecutar checks después de que la página cargue
    if (document.readyState === 'complete') {
      setTimeout(runChecks, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(runChecks, 1000));
    }

    // Listener para enlaces
    document.addEventListener('click', checkBrokenLinks);

    // Cleanup
    return () => {
      document.removeEventListener('click', checkBrokenLinks);
      console.error = originalConsoleError;
      if (reportTimer.current) {
        clearTimeout(reportTimer.current);
      }
    };
  }, []);

  const reportError = (error: ErrorReport) => {
    errorQueue.current.push(error);

    // Batch reporting - enviar cada 5 segundos o cuando haya 5 errores
    if (reportTimer.current) {
      clearTimeout(reportTimer.current);
    }

    const shouldSendNow = errorQueue.current.length >= 5;
    const delay = shouldSendNow ? 0 : 5000;

    reportTimer.current = setTimeout(() => {
      if (errorQueue.current.length > 0) {
        sendErrorBatch(errorQueue.current);
        errorQueue.current = [];
      }
    }, delay);
  };

  const sendErrorBatch = async (errors: ErrorReport[]) => {
    try {
      await fetch('/api/monitor/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          performance: {
            navigation: performance.getEntriesByType('navigation')[0],
            memory: (performance as any).memory
          }
        })
      });
    } catch (error) {
      console.warn('Failed to report errors:', error);
    }
  };

  return null; // Este componente no renderiza nada
}
