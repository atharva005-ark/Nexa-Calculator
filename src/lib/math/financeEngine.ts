export interface AmortizationRow {
  month: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  remainingBalance: number;
}

export interface EMIResult {
  monthlyEMI: number;
  totalInterest: number;
  totalPayment: number;
  principal: number;
  schedule: AmortizationRow[];
}

export function calculateEMI(principal: number, annualRatePercent: number, months: number): EMIResult {
  if (principal <= 0 || months <= 0 || annualRatePercent < 0) {
    throw new Error('Principal and tenure must be positive, and interest rate cannot be negative.');
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  let emi: number;
  if (monthlyRate === 0) {
    emi = principal / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    emi = (principal * monthlyRate * factor) / (factor - 1);
  }

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    let principalPaid = emi - interest;
    if (m === months) {
      principalPaid = balance;
    }
    const payment = principalPaid + interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    schedule.push({
      month: m,
      principalPaid,
      interestPaid: interest,
      totalPayment: payment,
      remainingBalance: balance,
    });
  }

  return {
    monthlyEMI: emi,
    totalInterest,
    totalPayment: principal + totalInterest,
    principal,
    schedule,
  };
}

export interface SIPResult {
  investedAmount: number;
  estimatedReturns: number;
  futureValue: number;
  yearlyBreakdown: Array<{ year: number; invested: number; value: number }>;
}

export function calculateSIP(monthlyInvestment: number, annualReturnPercent: number, years: number): SIPResult {
  if (monthlyInvestment <= 0 || years <= 0 || annualReturnPercent < 0) {
    throw new Error('Monthly investment and duration must be positive.');
  }
  const months = Math.round(years * 12);
  const r = annualReturnPercent / 12 / 100;

  const computeFV = (n: number) => {
    if (r === 0) return monthlyInvestment * n;
    return monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  };

  const futureValue = computeFV(months);
  const investedAmount = monthlyInvestment * months;
  const estimatedReturns = futureValue - investedAmount;

  const yearlyBreakdown: Array<{ year: number; invested: number; value: number }> = [];
  for (let y = 1; y <= Math.ceil(years); y++) {
    const m = Math.min(y * 12, months);
    yearlyBreakdown.push({
      year: y,
      invested: monthlyInvestment * m,
      value: computeFV(m),
    });
  }

  return {
    investedAmount,
    estimatedReturns,
    futureValue,
    yearlyBreakdown,
  };
}

export function calculateCompoundInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  compoundingPerYear = 4
) {
  const n = compoundingPerYear;
  const r = annualRatePercent / 100;
  const amount = principal * Math.pow(1 + r / n, n * years);
  return {
    principal,
    interest: amount - principal,
    totalAmount: amount,
  };
}

export function calculateSimpleInterest(principal: number, annualRatePercent: number, years: number) {
  const interest = (principal * annualRatePercent * years) / 100;
  return {
    principal,
    interest,
    totalAmount: principal + interest,
  };
}

export function calculateGST(amount: number, gstRatePercent: number, mode: 'exclusive' | 'inclusive') {
  if (mode === 'exclusive') {
    const gstAmount = (amount * gstRatePercent) / 100;
    return {
      baseAmount: amount,
      gstAmount,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      totalAmount: amount + gstAmount,
    };
  }
  const baseAmount = amount / (1 + gstRatePercent / 100);
  const gstAmount = amount - baseAmount;
  return {
    baseAmount,
    gstAmount,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    totalAmount: amount,
  };
}

export function calculateDiscount(originalPrice: number, discountPercent: number) {
  const savings = (originalPrice * discountPercent) / 100;
  return {
    originalPrice,
    savings,
    finalPrice: originalPrice - savings,
  };
}

export function calculateProfitLoss(costPrice: number, sellingPrice: number) {
  const diff = sellingPrice - costPrice;
  const percent = costPrice !== 0 ? (Math.abs(diff) / costPrice) * 100 : 0;
  return {
    status: diff > 0 ? 'Profit' : diff < 0 ? 'Loss' : 'Break-even',
    amount: Math.abs(diff),
    percent,
  };
}

export function calculateTip(billAmount: number, tipPercent: number, splitCount: number) {
  const people = Math.max(1, Math.round(splitCount));
  const tipAmount = (billAmount * tipPercent) / 100;
  const totalBill = billAmount + tipAmount;
  return {
    tipAmount,
    totalBill,
    perPerson: totalBill / people,
    tipPerPerson: tipAmount / people,
  };
}

export function calculateRetirement(params: {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturnPercent: number;
}) {
  const years = Math.max(1, params.retirementAge - params.currentAge);
  const months = years * 12;
  const r = params.annualReturnPercent / 12 / 100;
  const fvSavings = params.currentSavings * Math.pow(1 + r, months);
  const fvContrib =
    r === 0
      ? params.monthlyContribution * months
      : params.monthlyContribution * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  const totalCorpus = fvSavings + fvContrib;
  const totalPrincipal = params.currentSavings + params.monthlyContribution * months;
  return {
    yearsToGrow: years,
    totalPrincipal,
    estimatedGrowth: totalCorpus - totalPrincipal,
    projectedCorpus: totalCorpus,
  };
}
