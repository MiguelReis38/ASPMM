import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../lib/AuthContext';
import { Camera, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export const AccessControl = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: string, message: string, member?: any } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchLogs = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

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
  }, [selectedDate]);

  const startScanner = () => {
    setScannerActive(true);
    setScanResult(null);
    
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
      scannerRef.current = null;
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
        if (isGranted) {
           reason = 'Acesso liberado (Atenção: Possui mensalidades pendentes)';
        }
      }

      await supabase.from('access_logs').insert({
        member_id: member.id,
        scanned_by: user?.id,
        status: isGranted ? 'granted' : 'denied',
        reason: reason
      });

      setScanResult({
        status: isGranted ? 'success' : 'message',
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
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-lg flex items-center gap-2"><Camera size={20}/> Validar Acesso</h3>
          </CardHeader>
          <CardBody>
            {!scannerActive && !scanResult && (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">Utilize a câmera para ler o QR Code da carteirinha.</p>
                <Button onClick={startScanner} className="w-full max-w-xs mx-auto">Iniciar Leitor</Button>
              </div>
            )}

            {scannerActive && (
              <div>
                <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-brand-blue/20"></div>
                <div className="mt-4 text-center">
                   <Button variant="outline" onClick={stopScanner}>Cancelar</Button>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center mb-4">
                  {scanResult.status === 'success' || scanResult.status === 'message' ? (
                    <CheckCircle2 size={64} className="text-green-500" />
                  ) : (
                    <XCircle size={64} className="text-red-500" />
                  )}
                </div>
                <h4 className={`text-2xl font-bold mb-2 ${scanResult.status === 'success' || scanResult.status === 'message' ? 'text-green-600' : 'text-red-600'}`}>
                   {scanResult.status === 'success' || scanResult.status === 'message' ? 'Acesso Permitido' : 'Acesso Negado'}
                </h4>
                {scanResult.member && (
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-gray-800">{scanResult.member.full_name}</p>
                    <p className="text-gray-500">Sócio: {scanResult.member.member_code}</p>
                  </div>
                )}
                <p className="text-gray-600 mb-6 bg-gray-100 py-2 px-4 rounded-lg inline-block">{scanResult.message}</p>
                <div>
                  <Button onClick={startScanner}>Ler Novo QR Code</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Histórico de Acessos</h3>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-blue"
              />
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
