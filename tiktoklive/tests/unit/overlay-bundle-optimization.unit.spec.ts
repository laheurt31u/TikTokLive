import fs from 'fs';
import path from 'path';

describe('Overlay Bundle Optimization', () => {
  const nextConfigPath = path.join(__dirname, '../../next.config.ts');
  const overlayPagePath = path.join(__dirname, '../../app/overlay/page.tsx');

  it('should have Next.js configuration optimized for overlay', () => {
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

    // Vérifier les optimisations de build
    expect(nextConfigContent).toContain('optimizePackageImports');
    expect(nextConfigContent).toContain('splitChunks');
    expect(nextConfigContent).toContain('overlay');

    // Vérifier les headers de cache
    expect(nextConfigContent).toContain('Cache-Control');
    expect(nextConfigContent).toContain('max-age=31536000');
  });

  it('should implement lazy loading for non-critical components', () => {
    const overlayPageContent = fs.readFileSync(overlayPagePath, 'utf8');

    // Vérifier l'import lazy
    expect(overlayPageContent).toContain('lazy(() => import(');
    expect(overlayPageContent).toContain('Leaderboard');

    // Vérifier l'usage de Suspense
    expect(overlayPageContent).toContain('Suspense');
    expect(overlayPageContent).toContain('fallback');
  });

  it('should have memoized components for performance', () => {
    const leaderboardPath = path.join(__dirname, '../../components/overlay/Leaderboard.tsx');
    const leaderboardContent = fs.readFileSync(leaderboardPath, 'utf8');

    // Vérifier l'usage de memo
    expect(leaderboardContent).toContain('memo(');
    expect(leaderboardContent).toContain('displayName');
  });

  it('should have bundle size checking script', () => {
    const scriptPath = path.join(__dirname, '../../scripts/check-overlay-bundle-size.js');

    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Vérifier que le script vérifie la taille
    expect(scriptContent).toContain('TARGET_SIZE_KB');
    expect(scriptContent).toContain('200');
    expect(scriptContent).toContain('gzippé');
  });

  it('should have GPU acceleration optimizations', () => {
    const questionDisplayPath = path.join(__dirname, '../../components/overlay/QuestionDisplay.tsx');
    const questionDisplayContent = fs.readFileSync(questionDisplayPath, 'utf8');

    // Vérifier les optimisations GPU
    expect(questionDisplayContent).toContain('translateZ(0)');
    expect(questionDisplayContent).toContain('backfaceVisibility');
    expect(questionDisplayContent).toContain('will-change');
  });
});