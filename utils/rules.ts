// filepath: utils/rules.ts
import { differenceInYears } from 'date-fns';

export const calculateMonthlyFee = (birthDate: string, isPcd: boolean, isDependent: boolean): number => {
    if (!isDependent) return 50.00; // Titular sempre paga

    const age = differenceInYears(new Date(), new Date(birthDate));

    // Regra de Isenção: Menor de 18, Idoso (60+) ou PCD
    if (age < 18 || age >= 60 || isPcd) {
        return 0.00;
    }

    return 50.00;
};