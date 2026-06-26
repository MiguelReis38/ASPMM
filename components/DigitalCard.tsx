import React from 'react'
import QRCode from 'qrcode.react'

interface DigitalCardProps {
  member: {
    full_name: string
    cpf: string
    id: string
    is_dependent: boolean
    status: string
    category?: string
    photo_url?: string
    member_code: string
  }
}

export const DigitalCard = ({ member }: DigitalCardProps) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white text-gray-800 rounded-2xl shadow-premium overflow-hidden border border-gray-200 flex flex-col min-h-[480px]">
      
      {/* Header with Logos */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          {/* Brasão Image */}
          <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            <img src="/images/escudo.png" alt="Brasão ASPMM" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none' }} />
          </div>
          {/* Logo Leão Horizontal */}
          <div className="h-8 w-24 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            <img src="/images/logo.png" alt="Logo Leão ASPMM" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none' }} />
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase rounded-full ${member.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {member.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex gap-4 items-center mb-auto mt-4">
          <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center flex-shrink-0 relative">
            {member.photo_url ? (
              <img src={member.photo_url} alt="Foto" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Nome do Associado</p>
            <p className="font-bold text-lg leading-tight truncate mb-2">{member.full_name}</p>
            
            <p className="text-[10px] text-gray-500 uppercase">Categoria</p>
            <p className="font-semibold text-sm text-brand-blue">{member.category || 'Titular'}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center my-6 flex-1">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
             <QRCode value={`https://aspmm.app/validador?code=${member.member_code}`} size={160} level="M" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center uppercase tracking-widest font-semibold">QR Code de Acesso</p>
        </div>

        <div className="flex justify-between items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Código Sócio</p>
            <p className="font-mono font-bold text-sm tracking-wider text-gray-700">{member.member_code}</p>
          </div>
          <div>
             <p className="text-[10px] text-gray-500 uppercase text-right">Documento</p>
             <p className="font-mono text-sm tracking-wider text-gray-600">***.{member.cpf.slice(3,6)}.{member.cpf.slice(6,9)}-**</p>
          </div>
        </div>
      </div>
    </div>
  )
}