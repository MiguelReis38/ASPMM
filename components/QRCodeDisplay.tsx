import React, { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { generateAccessKey } from '../utils'

export const QRCodeDisplay = ({ memberId }: { memberId: string }) => {
  const [accessKey, setAccessKey] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    const updateKey = () => {
      setAccessKey(generateAccessKey(memberId))
      setTimeLeft(30)
    }

    updateKey()

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAccessKey(generateAccessKey(memberId))
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [memberId])

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-card border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Catraca Digital</h3>
      
      <div className="bg-white p-4 rounded-xl border-2 border-brand-blue/20 shadow-inner mb-4">
        {accessKey ? (
          <QRCodeSVG 
            value={accessKey} 
            size={200}
            level="H"
            includeMargin={true}
            fgColor="#0056b3"
          />
        ) : (
          <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 text-gray-400">
            Gerando...
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">Este QR Code é dinâmico e expira em</p>
        <p className="text-2xl font-mono font-bold text-brand-red">{timeLeft}s</p>
      </div>
    </div>
  )
}
