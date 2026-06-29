import React from 'react'
import QRCode from 'qrcode.react'

interface PrintCardProps {
  member: {
    full_name: string
    cpf: string
    id: string
    is_dependent: boolean
    status: string
    category?: string
    photo_url?: string
    member_code: string
    matricula?: string
    birth_date?: string
    validity_date?: string
  }
}

export const PrintCard = ({ member }: PrintCardProps) => {
  return (
    <div 
      className="bg-white text-gray-800 border-[1.5px] border-gray-400 relative overflow-hidden"
      style={{
        width: '86mm', 
        height: '54mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Esquerda: Foto e QR Code */}
      <div className="w-[30%] h-full bg-brand-blue flex flex-col items-center justify-center py-2 border-r border-brand-blue/30 gap-2">
        <div className="w-[20mm] h-[25mm] bg-white rounded overflow-hidden border border-white/50 flex flex-col items-center justify-center">
          {member.photo_url ? (
            <img src={member.photo_url} alt="Foto" className="w-full h-full object-cover" />
          ) : (
             <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          )}
        </div>
        
        <div className="bg-white p-1 rounded shadow-sm">
          <QRCode value={`https://aspmm.netlify.app/validador?code=${member.member_code}`} size={44} level="M" fgColor="#1F4287" />
        </div>
      </div>

      {/* Direita: Dados */}
      <div className="w-[70%] h-full flex flex-col p-3 relative">
        {/* Background watermark */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
           <img src="/images/brasao.png" className="w-16 h-16 object-contain grayscale" />
        </div>

        {/* Topo: Logos */}
        <div className="flex justify-between items-start mb-3 h-8">
           <div className="flex gap-2 items-center">
             <img src="/images/brasao.png" className="h-8 w-auto object-contain" />
             <img src="/images/logo.png" className="h-6 w-auto object-contain" />
           </div>
        </div>

        {/* Meio: Nome */}
        <div className="flex-1">
          <p className="text-[8px] text-brand-blue font-bold uppercase tracking-wider mb-0.5">Nome do Associado</p>
          <p className="font-bold text-[12px] leading-tight text-gray-900 uppercase">
            {member.full_name}
          </p>
        </div>

        {/* Rodapé: Dados */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 border-t pt-1 border-gray-200">
          <div>
             <p className="text-[6px] text-gray-500 uppercase font-bold">Matrícula</p>
             <p className="font-bold text-[8px] text-brand-blue">{member.matricula || member.member_code}</p>
          </div>
          <div>
             <p className="text-[6px] text-gray-500 uppercase font-bold">Categoria</p>
             <p className="font-bold text-[8px] text-gray-800 truncate">{member.category || 'Titular'}</p>
          </div>
          <div>
             <p className="text-[6px] text-gray-500 uppercase font-bold">Nascimento</p>
             <p className="font-bold text-[8px] text-gray-800">{member.birth_date ? new Date(member.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</p>
          </div>
          <div>
             <p className="text-[6px] text-gray-500 uppercase font-bold">Vencimento</p>
             <p className="font-bold text-[8px] text-gray-800">{member.validity_date ? new Date(member.validity_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indeterminado'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
