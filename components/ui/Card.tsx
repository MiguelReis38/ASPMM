import React from 'react'

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`bg-white rounded-xl shadow-card overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

export const CardBody = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}
