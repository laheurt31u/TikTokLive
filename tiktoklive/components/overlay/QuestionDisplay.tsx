import { useEffect, useRef, useState } from 'react';
import { detectOBSResolution, getAdaptiveFontSize, getOptimizedAnimationDuration } from '../../lib/overlay-utils';

interface Question {
  id: string;
  text: string;
  timestamp: number;
}

interface QuestionDisplayProps {
  question: Question;
}

export default function QuestionDisplay({ question }: QuestionDisplayProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const renderStartTime = useRef<number>(0);
  const [resolution, setResolution] = useState(() => detectOBSResolution());

  useEffect(() => {
    // Détecter la résolution au montage et redimensionnement
    const updateResolution = () => {
      setResolution(detectOBSResolution());
    };

    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, []);

  useEffect(() => {
    renderStartTime.current = performance.now();

    // Mesurer la performance de rendu pour optimisation streaming
    const measureRenderTime = () => {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > 16) {
        console.warn(`QuestionDisplay render took ${renderTime.toFixed(2)}ms - exceeds 16ms/frame target for 60fps`);
      }
    };

    // Utiliser requestAnimationFrame pour mesurer après le rendu
    requestAnimationFrame(measureRenderTime);
  }, [question.id]);

  // Calculer les valeurs adaptatives
  const adaptiveFontSize = getAdaptiveFontSize(48, resolution); // Base 48px
  const animationDuration = getOptimizedAnimationDuration(resolution);

  // Animation d'entrée optimisée pour GPU avec durée adaptative
  const animationStyles = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(${30 * resolution.scale}px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .slide-in {
      animation: slideIn ${animationDuration}s cubic-bezier(0.34, 1.56, 0.64, 1);
      will-change: transform, opacity;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div
        ref={elementRef}
        className="question-display slide-in font-bold text-center leading-relaxed max-w-4xl mx-auto px-4"
        style={{
          fontSize: `${adaptiveFontSize}px`,
          whiteSpace: 'pre-line',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: `2px 2px 4px rgba(0,0,0,0.8)`,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          // Optimisations GPU pour animations fluides
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {question.text}
      </div>
    </>
  );
}