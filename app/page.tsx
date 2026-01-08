import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-8">
          🎯 TikTokLive
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Système de quiz interactif pour vos lives TikTok
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">🎮 Interface Overlay</h3>
            <p className="text-gray-600 mb-4">
              Interface optimisée pour OBS qui affiche les questions et le leaderboard en temps réel.
            </p>
            <Link
              href="/app/overlay"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Accéder à l'Overlay
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">⚙️ Configuration</h3>
            <p className="text-gray-600 mb-4">
              Guide complet pour intégrer TikTokLive dans votre setup de streaming.
            </p>
            <a
              href="/docs/obs-overlay-configuration.md"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Voir la Documentation
            </a>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Status:</strong> Interface overlay en développement.
                Le serveur WebSocket sera bientôt disponible pour la connexion temps réel avec TikTok.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}