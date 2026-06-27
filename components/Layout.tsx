import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { LogOut, User, LayoutDashboard, Settings, Users, UserPlus, DollarSign, Megaphone, ScanLine, Menu, X } from 'lucide-react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { member, session } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!session) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{children}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between bg-brand-blue text-white p-4 shadow-md z-20">
        <h1 className="text-xl font-bold tracking-wider">ASPMM</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-brand-blue text-white shadow-premium flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 text-center border-b border-white/20 hidden md:block">
          <h1 className="text-2xl font-bold tracking-wider">ASPMM</h1>
          <p className="text-sm text-brand-blueLight mt-1 opacity-80">Portal do Servidor</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {member?.role === 'admin' || member?.role === 'president' ? (
            <>
              <div className="px-4 pb-2 mb-2 border-b border-white/10 hidden md:block">
                <p className="text-xs font-bold text-brand-blueLight uppercase tracking-wider">Painel Administrativo</p>
              </div>
              <Link href="/admin/dashboard?tab=associados" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.asPath.includes('tab=associados') || router.asPath === '/admin/dashboard' ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                <Users size={20} /> Associados
              </Link>
              <Link href="/admin/dashboard?tab=cadastros" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.asPath.includes('tab=cadastros') ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                <UserPlus size={20} /> Cadastros
              </Link>
              {member?.role === 'president' && (
                <Link href="/admin/dashboard?tab=financeiro" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.asPath.includes('tab=financeiro') ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                  <DollarSign size={20} /> Financeiro
                </Link>
              )}
              <Link href="/admin/dashboard?tab=comunicacao" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.asPath.includes('tab=comunicacao') ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                <Megaphone size={20} /> Comunicação
              </Link>
              <Link href="/admin/dashboard?tab=acessos" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.asPath.includes('tab=acessos') ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                <ScanLine size={20} /> Controle de Acesso
              </Link>
            </>
          ) : (
            <>
              <Link href="/member/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${router.pathname === '/member/dashboard' ? 'bg-brand-blueDark' : 'hover:bg-white/10'}`}>
                <User size={20} /> Meu Perfil
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-white font-bold shadow-md">
              {member?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{member?.full_name}</p>
              <p className="text-xs text-brand-blueLight truncate">{member?.role === 'president' ? 'Presidente' : member?.role === 'admin' ? 'Administrador' : 'Associado'}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister()
                  }
                })
              }
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings size={16} /> Atualizar App
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-sm text-brand-redLight hover:text-white hover:bg-brand-red rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
