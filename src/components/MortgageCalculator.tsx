import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export const MortgageCalculator = () => {
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  const calculateMortgage = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12;
    const months = parseFloat(years) * 12;

    if (principal && rate && months) {
      const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      setMonthlyPayment(payment);
    } else {
      setMonthlyPayment(null);
    }
  };

  useEffect(() => {
    if (loanAmount && interestRate && years) {
      calculateMortgage();
    }
  }, [loanAmount, interestRate, years]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          מחשבון משכנתא
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="loan">סכום הלוואה (₪)</Label>
          <Input
            id="loan"
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            placeholder="1000000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest">ריבית שנתית (%)</Label>
          <Input
            id="interest"
            type="number"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="3.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="years">תקופה (שנים)</Label>
          <Input
            id="years"
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="25"
          />
        </div>
        {monthlyPayment !== null && monthlyPayment > 0 && (
          <div className="mt-6 p-6 bg-primary/10 rounded-lg border-2 border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">החזר חודשי משוער</p>
            <p className="text-3xl font-bold text-primary">
              ₪{monthlyPayment.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              סה״כ תשלום: ₪{(monthlyPayment * parseFloat(years) * 12).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
