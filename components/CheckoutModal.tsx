import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './ui/Button';

interface CheckoutModalProps {
  paymentId: string;
  amount: number;
  dueDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal = ({ paymentId, amount, dueDate, onClose, onSuccess }: CheckoutModalProps) => {
  const [tab, setTab] = useState<'pix' | 'card' | 'boleto'>('pix');
  const [loading, setLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const simulatePayment = async () => {
    setLoading(true);
    // Simulating network delay for payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSuccess();
    setLoading(false);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540550.005802BR5913ASPMM Marilia6007Marilia62070503***6304");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Pagamento de Mensalidade</h3>
            <p className="text-sm text-gray-500">Vencimento: {new Date(dueDate).toLocaleDateString('pt-BR')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Amount Banner */}
        <div className="bg-brand-blue text-white text-center py-6">
          <p className="text-white/80 text-sm mb-1">Valor a pagar</p>
          <p className="text-4xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'pix' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('pix')}
          >
            Pix
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'card' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('card')}
          >
            Cartão de Crédito
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'boleto' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('boleto')}
          >
            Boleto
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {tab === 'pix' && (
            <div className="text-center space-y-6">
              <p className="text-gray-600 text-sm">Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>
              <div className="flex justify-center p-4 bg-white border-2 border-gray-100 rounded-xl inline-block shadow-sm">
                <QRCodeSVG value={`pix-simulated-${paymentId}`} size={200} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Ou use o recurso Copia e Cola:</p>
                <div className="flex">
                  <input type="text" readOnly value="00020126580014br.gov.bcb.pix..." className="w-full bg-gray-50 border rounded-l-lg px-3 text-sm text-gray-500 outline-none" />
                  <button onClick={handleCopyPix} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-r-lg text-sm font-medium transition-colors whitespace-nowrap">
                    {pixCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <Button onClick={simulatePayment} isLoading={loading} className="w-full mt-4">
                Simular Pagamento Pago (Teste)
              </Button>
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número do Cartão</label>
                <input type="text" placeholder="0000 0000 0000 0000" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome no Cartão</label>
                <input type="text" placeholder="JOAO DA SILVA" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Validade</label>
                  <input type="text" placeholder="MM/AA" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                  <input type="text" placeholder="123" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" />
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={simulatePayment} isLoading={loading} className="w-full">
                  Pagar {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                </Button>
              </div>
            </div>
          )}

          {tab === 'boleto' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-gray-600">O boleto será gerado com vencimento para {new Date(dueDate).toLocaleDateString('pt-BR')}.</p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => alert("Simulação: Boleto baixado!")}>
                  Baixar PDF do Boleto
                </Button>
                <Button onClick={simulatePayment} isLoading={loading} className="w-full">
                  Simular Pagamento (Teste)
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
