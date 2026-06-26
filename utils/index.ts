import { format } from 'date-fns';

export function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function calculateAge(birthDateString: string): number {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isDependentExempt(birthDate: string, isPcd: boolean): boolean {
  if (isPcd) return true;
  const age = calculateAge(birthDate);
  if (age < 18 || age >= 60) return true;
  return false;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function generateAccessKey(memberId: string): string {
  // Simple time-based generation for demo
  // In a real scenario, this would be cryptographically signed by the server
  // and validated by the turnstile.
  const timestamp = Math.floor(Date.now() / 30000); // changes every 30 seconds
  return `${memberId}-${timestamp}`;
}

export function getTenthBusinessDay(year: number, month: number): Date {
  let businessDays = 0;
  let currentDate = new Date(year, month, 1);
  
  while (businessDays < 10) {
    const dayOfWeek = currentDate.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    if (businessDays < 10) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return currentDate;
}
