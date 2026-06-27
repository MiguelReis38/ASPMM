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
      
      {/* Header with Logos - Azul */}
      <div className="flex justify-between items-center p-4 border-b border-brand-blue/20 bg-brand-blue text-white">
        <div className="flex items-center gap-3">
          {/* Brasão Image */}
          <div className="w-12 h-16 flex items-center justify-center overflow-hidden">
            <img src="/images/brasao.png" alt="Brasão ASPMM" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display='none' }} />
          </div>
          {/* Logo Leão Horizontal */}
          <div className="h-10 w-32 flex items-center justify-center overflow-hidden">
            <img src="/images/logo.png" alt="Logo Leão ASPMM" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display='none' }} />
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase rounded-full ${member.status === 'active' ? 'bg-green-400 text-green-900 border border-green-500' : 'bg-red-400 text-red-900 border border-red-500'} shadow-sm`}>
            {member.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 relative">
        {/* Fundo sutil para combinar com o azul e branco */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-brand-blue/5 to-transparent pointer-events-none" />
        
        <div className="flex gap-4 items-center mb-auto mt-2 relative z-10">
          <div className="w-20 h-24 bg-white rounded-lg overflow-hidden border-2 border-brand-blue flex items-center justify-center flex-shrink-0 relative shadow-sm">
            {member.photo_url ? (
              <img src={member.photo_url} alt="Foto" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-brand-blue font-bold uppercase tracking-wider">Nome do Associado</p>
            <p className="font-bold text-lg leading-tight truncate mb-2 text-gray-800">{member.full_name}</p>
            
            <p className="text-[10px] text-brand-blue font-bold uppercase tracking-wider">Categoria</p>
            <p className="font-semibold text-sm text-gray-600">{member.category || 'Titular'}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center my-6 flex-1 relative z-10">
          <div className="bg-white p-3 rounded-xl shadow-md border-2 border-brand-blue/20">
             <QRCode value={`https://aspmm.netlify.app/validador?code=${member.member_code}`} size={160} level="M" fgColor="#1F4287" />
          </div>
          <p className="text-xs text-brand-blue mt-3 text-center uppercase tracking-widest font-bold">QR Code de Acesso</p>
        </div>

        <div className="flex justify-between items-end bg-brand-blue p-4 rounded-xl border border-brand-blue shadow-inner relative z-10 text-white">
          <div>
            <p className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider">Código Sócio</p>
            <p className="font-mono font-bold text-base tracking-widest">{member.member_code}</p>
          </div>
          <div>
             <p className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider text-right">Documento</p>
             <p className="font-mono text-base tracking-widest">***.{member.cpf ? member.cpf.slice(3,6) : '000'}.{member.cpf ? member.cpf.slice(6,9) : '000'}-**</p>
          </div>
        </div>
      </div>
    </div>
  )
}