import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Verificación de IA',
  description: 'Plataforma para verificar y evaluar modelos de IA usando cámara web en tiempo real',
  keywords: 'AI, verificación, cámara, machine learning, evaluación',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      Sistema de Verificación de IA
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Evaluación con cámara web en tiempo real
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                    Sistema Activo
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>
          
          <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col md:flex-row items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-4">
                  <span>© 2024 Sistema de Verificación de IA</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">Evaluación automática de modelos</span>
                </div>
                <div className="flex items-center space-x-4 mt-2 md:mt-0">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Cámara disponible</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>IA preparada</span>
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}