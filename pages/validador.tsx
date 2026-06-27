import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { Layout } from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useRouter } from 'next/router'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Validador() {
  const { member } = useAuth()
  const router = useRouter()
  const [scanResult, setScanResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  // Initialize from URL ?code=XXX
  useEffect(() => {
    if (router.query.code && typeof router.query.code === 'string') {
      validateCode(router.query.code)
    }
  }, [router.query.code])

  // Initialize QR Scanner when tab opens
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      scanner.render(
        (decodedText) => {
          // Check if it's an URL like https://aspmm.app/validador?code=123456
          let codeToValidate = decodedText;
          if (decodedText.includes('code=')) {
            codeToValidate = new URL(decodedText).searchParams.get('code') || decodedText;
          }
          if(scanner) scanner.clear();
          setIsScanning(false)
          validateCode(codeToValidate)
        },
        (error) => {
          // ignore scan errors (it fires constantly when searching)
        }
      );
    }
    return () => {
      if (scanner) scanner.clear().catch(e => console.error(e))
    }
  }, [isScanning])

  const validateCode = async (code: string) => {
    if (!code) return;
    setLoading(true)
    try {
      const res = await fetch('/api/admin/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      setScanResult(data)
      
      // Update URL so they can reload
      router.replace({ query: { code } }, undefined, { shallow: true })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateCode(manualCode)
  }

  const resetScanner = () => {
    setScanResult(null)
    setManualCode('')
    setIsScanning(true)
    router.replace('/validador', undefined, { shallow: true })
  }

  // Permissão apenas para Admins ou Presidente
  if (member?.role !== 'admin' && member?.role !== 'president') {
    return <Layout><div className="p-10 text-center text-red-500">Acesso Restrito à Administração/Portaria</div></Layout>
  }

  return (
    <Layout>
      <Head>
        <title>Validador Portaria | ASPMM</title>
      </Head>

      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col justify-center">
        {!scanResult ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-center mb-6">Validação de Entrada</h2>
            
            {isScanning ? (
              <div id="reader" className="w-full overflow-hidden rounded-lg mb-6"></div>
            ) : (
              <Button className="w-full mb-6 bg-brand-blue" onClick={() => setIsScanning(true)}>Abrir Câmera / Escanear QR</Button>
            )}

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OU DIGITE O CÓDIGO</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input 
                placeholder="Ex: 849302" 
                value={manualCode} 
                onChange={(e) => setManualCode(e.target.value)} 
                className="flex-1"
              />
              <Button type="submit" isLoading={loading}>Validar</Button>
            </form>
          </div>
        ) : (
          <div className={`rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 ${scanResult.allowed ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            <div className={`p-6 text-center text-white ${scanResult.allowed ? 'bg-green-500' : 'bg-red-500'}`}>
              <h1 className="text-4xl font-black mb-1">{scanResult.allowed ? 'LIBERADO' : 'BLOQUEADO'}</h1>
              <p className="text-white/90 font-medium uppercase tracking-widest text-sm">{scanResult.message}</p>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center">
              {scanResult.member ? (
                <>
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 bg-white shadow-lg mb-4">
                    {scanResult.member.photo_url ? (
                      <img src={scanResult.member.photo_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">Sem Foto</div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">{scanResult.member.full_name}</h2>
                  <p className="text-gray-500 font-mono mb-4 text-sm">Código: {scanResult.member.member_code}</p>
                  
                  <span className="inline-block px-3 py-1 bg-brand-blueLight text-brand-blueDark rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    {scanResult.member.category || 'Titular'}
                  </span>

                  <div className="text-left w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-2">
                    <p className="text-sm text-gray-600"><strong>CPF:</strong> {scanResult.member.cpf || 'Não informado'}</p>
                    <p className="text-sm text-gray-600"><strong>Data de Nasc.:</strong> {scanResult.member.birth_date ? new Date(scanResult.member.birth_date).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                    <p className="text-sm text-gray-600"><strong>Telefone:</strong> {scanResult.member.phone || 'Não informado'}</p>
                    <p className="text-sm text-gray-600"><strong>Órgão:</strong> {scanResult.member.workplace || 'Não informado'}</p>
                  </div>
                  
                  
                  {!scanResult.allowed && scanResult.reason === 'DEBT' && (
                    <div className="w-full bg-white p-4 rounded-xl border border-red-200 shadow-sm text-left">
                      <p className="text-red-600 font-bold text-sm mb-2">Mensalidades Atrasadas:</p>
                      <ul className="text-sm space-y-1">
                        {scanResult.debts.map((d: any) => (
                          <li key={d.id} className="flex justify-between border-b pb-1 last:border-0">
                            <span className="text-gray-600">Venc. {new Date(d.due_date).toLocaleDateString('pt-BR')}</span>
                            <span className="font-bold text-red-500">R$ {d.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-red-500 font-medium">Sócio não encontrado no sistema.</p>
              )}
            </div>

            <div className="p-4 bg-white/50">
              <Button onClick={resetScanner} className="w-full" variant={scanResult.allowed ? 'outline' : 'danger'}>Escanear Próximo</Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
