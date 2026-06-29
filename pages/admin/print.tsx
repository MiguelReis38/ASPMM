import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getServiceSupabase } from '../../lib/supabase'
import { PrintCard } from '../../components/admin/PrintCard'
import Head from 'next/head'

export default function PrintPage() {
  const router = useRouter()
  const { ids } = router.query
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    
    const fetchMembers = async () => {
      if (!ids) {
        setLoading(false)
        return
      }
      
      const idList = (ids as string).split(',')
      
      try {
        const res = await fetch(`/api/admin/get-members-by-ids?ids=${idList.join(',')}`)
        const data = await res.json()
        if (data.members) {
          setMembers(data.members)
        }
      } catch (e) {
        console.error("Erro ao buscar", e)
      } finally {
        setLoading(false)
        // Wait a little bit for images/QR codes to render before printing
        setTimeout(() => {
          window.print()
        }, 1500)
      }
    }

    fetchMembers()
  }, [router.isReady, ids])

  if (loading) {
    return <div className="p-10 text-center font-bold">Preparando para impressão...</div>
  }

  if (members.length === 0) {
    return <div className="p-10 text-center font-bold">Nenhum associado encontrado para impressão.</div>
  }

  return (
    <>
      <Head>
        <title>Impressão de Carteirinhas - ASPMM</title>
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </Head>
      
      {/* Container Principal A4 */}
      <div className="bg-white min-h-screen">
        <div className="no-print p-4 bg-gray-100 flex justify-between items-center border-b">
           <p className="font-bold text-gray-600">Pré-visualização de Impressão ({members.length} carteirinhas)</p>
           <div className="space-x-4">
             <button onClick={() => router.back()} className="px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50">
               Voltar
             </button>
             <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue text-white rounded shadow-sm hover:bg-blue-800">
               Imprimir Agora
             </button>
           </div>
        </div>

        {/* 
          A4 format: 210mm x 297mm
          Cards: 86mm x 54mm
          Grid: 2 cols x 5 rows = 10 cards per page.
          We use CSS flex/grid to automatically wrap onto new pages.
        */}
        <div 
          className="mx-auto" 
          style={{ 
            width: '210mm', 
            padding: '12mm 14mm', // Top/bottom and Left/Right padding
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 86mm)',
            gridAutoRows: '54mm',
            columnGap: '10mm',
            rowGap: '3mm'
          }}
        >
          {members.map(member => (
            <div key={member.id} style={{ pageBreakInside: 'avoid' }}>
               <PrintCard member={member} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
