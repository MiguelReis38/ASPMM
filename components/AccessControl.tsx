import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../lib/AuthContext';
import { Camera, CheckCircle2, XCircle, QrCode, X, ScanLine, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';

export const AccessControl = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: string, message: string, member?: any } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchLogs = async () => {
    const [sYear, sMonth, sDay] = startDate.split('-');
    const [eYear, eMonth, eDay] = endDate.split('-');
    const startOfDay = new Date(parseInt(sYear), parseInt(sMonth) - 1, parseInt(sDay), 0, 0, 0, 0);
    const endOfDay = new Date(parseInt(eYear), parseInt(eMonth) - 1, parseInt(eDay), 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('access_logs')
      .select('*, members(full_name, member_code)')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLogs(data);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const startScanner = () => {
    setScannerActive(true);
    setScanResult(null);
    
    setTimeout(() => {
      scannerRef.current = new Html5Qrcode("reader");
      scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      ).catch(error => {
        console.error("Failed to start scanner. ", error);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
      }).catch(error => {
        console.error("Failed to stop scanner. ", error);
      });
    }
    setScannerActive(false);
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (scannerRef.current) {
        stopScanner();
    }

    let memberCode = '';
    try {
      const url = new URL(decodedText);
      memberCode = url.searchParams.get('code') || '';
    } catch (e) {
      memberCode = decodedText;
    }

    if (!memberCode) {
      setScanResult({ status: 'error', message: 'QR Code inválido. Código de membro não encontrado.' });
      return;
    }

    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('member_code', memberCode)
        .single();

      if (error || !member) {
        setScanResult({ status: 'error', message: 'Associado não encontrado no sistema.' });
        return;
      }

      let isGranted = true;
      let reason = 'Acesso liberado.';

      if (member.status !== 'active') {
        isGranted = false;
        reason = 'Associado Inativo.';
      } else if (member.validity_date && new Date(member.validity_date) < new Date()) {
        isGranted = false;
        reason = 'Carteirinha Vencida.';
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', member.id)
        .eq('status', 'pending');
        
      if (payments && payments.length > 0) {
        isGranted = false;
        reason = 'Acesso Negado: Mensalidade Pendente.';
      }

      await supabase.from('access_logs').insert({
        member_id: member.id,
        scanned_by: user?.id,
        status: isGranted ? 'granted' : 'denied',
        reason: reason
      });

      setScanResult({
        status: isGranted ? 'success' : 'error',
        message: reason,
        member: member
      });

      fetchLogs(); 

    } catch (err) {
      console.error(err);
      setScanResult({ status: 'error', message: 'Erro ao processar validação.' });
    }
  };

  const onScanFailure = (error: any) => {
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(e => console.error(e));
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-premium overflow-hidden">
          <div className="bg-gradient-to-r from-brand-blue to-brand-blueLight p-4 flex items-center gap-3 text-white">
            <ScanLine className="w-6 h-6 opacity-80" />
            <h3 className="font-semibold text-lg">Validar Acesso</h3>
          </div>
          <CardBody className="p-6 bg-gray-50/50">
            {!scannerActive && !scanResult && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <QrCode size={40} strokeWidth={1.5} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Leitor de Carteirinha</h4>
                <p className="text-gray-500 mb-8 max-w-xs">Aponte a câmera para o QR Code da carteirinha digital do associado para validar a entrada no clube.</p>
                <Button 
                  onClick={startScanner} 
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Camera size={22} /> Iniciar Leitor
                </Button>
              </div>
            )}

            {scannerActive && (
              <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center">
                <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-4 border-brand-blue shadow-xl bg-black">
                  <div id="reader" className="w-full"></div>
                  {/* Subtle scanning animation line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-brand-blue/50 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] top-1/2 animate-scan pointer-events-none"></div>
                </div>
                <div className="mt-6 text-center w-full max-w-sm">
                   <Button variant="outline" onClick={stopScanner} className="w-full flex items-center justify-center gap-2 py-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                     <X size={20} /> Cancelar Leitura
                   </Button>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-lg p-6 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center mb-4">
                  {scanResult.status === 'success' || scanResult.status === 'message' ? (
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
                      <UserCheck size={48} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center shadow-inner">
                      <XCircle size={48} className="text-red-500" />
                    </div>
                  )}
                </div>
                <h4 className={`text-2xl font-black tracking-tight mb-2 ${scanResult.status === 'success' || scanResult.status === 'message' ? 'text-green-600' : 'text-red-600'}`}>
                   {scanResult.status === 'success' || scanResult.status === 'message' ? 'ACESSO PERMITIDO' : 'ACESSO NEGADO'}
                </h4>
                {scanResult.member && (
                  <div className="mb-6 mt-4">
                    <p className="text-xl font-bold text-gray-800">{scanResult.member.full_name}</p>
                    <p className="text-brand-blue font-semibold uppercase tracking-wider text-xs mt-1">Sócio: {scanResult.member.member_code}</p>
                    <div className="mt-4 text-left bg-gray-50/80 p-4 rounded-xl border border-gray-100 shadow-inner text-sm text-gray-700 space-y-2">
                       <div className="flex justify-between border-b border-gray-200/60 pb-2">
                         <span className="text-gray-500">CPF</span>
                         <span className="font-medium">{scanResult.member.cpf || 'Não informado'}</span>
                       </div>
                       <div className="flex justify-between border-b border-gray-200/60 pb-2">
                         <span className="text-gray-500">Telefone</span>
                         <span className="font-medium">{scanResult.member.phone || 'Não informado'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-500">Órgão</span>
                         <span className="font-medium">{scanResult.member.workplace || 'Não informado'}</span>
                       </div>
                    </div>
                  </div>
                )}
                <div className={`mb-6 p-4 rounded-xl inline-block w-full border ${scanResult.status === 'success' ? 'bg-green-50 border-green-100 text-green-800' : scanResult.status === 'message' ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  <p className="font-medium">{scanResult.message}</p>
                </div>
                <div>
                  <Button onClick={startScanner} className="w-full py-3 flex items-center justify-center gap-2 text-lg shadow-md">
                    <ScanLine size={20} /> Nova Leitura
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-semibold text-lg">Histórico de Acessos</h3>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-gray-50 flex-1 sm:flex-none"
                />
                <span className="text-gray-500 text-sm">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-gray-50 flex-1 sm:flex-none"
                />
                <Button 
                  variant="outline" 
                  className="text-brand-blue border-brand-blue py-1.5 px-3 h-auto"
                  onClick={() => {
                    const csv = Papa.unparse(logs.map(log => ({
                      Data_Hora: new Date(log.created_at).toLocaleString('pt-BR'),
                      Socio: log.members?.full_name || 'Desconhecido',
                      Codigo: log.members?.member_code || '-',
                      Status: log.status === 'granted' ? 'Permitido' : 'Negado',
                      Motivo: log.reason || ''
                    })))
                    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement("a")
                    link.href = URL.createObjectURL(blob)
                    link.setAttribute("download", `acessos_${startDate}_a_${endDate}.csv`)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                >
                  Exportar (CSV)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-y-auto max-h-[400px] pr-2">
              {logs.length === 0 ? (
                <p className="text-center text-gray-500 py-6">Nenhum acesso registrado neste dia.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-800">{log.members?.full_name || 'Desconhecido'}</p>
                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()} • Sócio: {log.members?.member_code}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.status === 'granted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status === 'granted' ? 'Liberado' : 'Negado'}
                        </span>
                        {log.reason && log.status === 'granted' && log.reason.includes('pendentes') && (
                          <p className="text-[10px] text-orange-600 mt-1 font-semibold">Pendências</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
