import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export const TransactionCostCalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<string>("");
  const [purchaseTax, setPurchaseTax] = useState<string>("");
  const [lawyerFee, setLawyerFee] = useState<string>("");
  const [brokerFee, setBrokerFee] = useState<string>("");
  const [renovation, setRenovation] = useState<string>("");
  const [fees, setFees] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [totalCost, setTotalCost] = useState<number | null>(null);

  const calculateTotalCost = () => {
    const price = parseFloat(propertyPrice) || 0;
    const tax = parseFloat(purchaseTax) || 0;
    const lawyer = parseFloat(lawyerFee) || 0;
    const broker = parseFloat(brokerFee) || 0;
    const reno = parseFloat(renovation) || 0;
    const feesCost = parseFloat(fees) || 0;
    
    // Calculate financing cost
    const loan = parseFloat(loanAmount) || 0;
    const rate = parseFloat(interestRate) / 100 / 12 || 0;
    const yearsNum = parseFloat(years) || 0;
    const months = yearsNum * 12;
    
    let financingCost = 0;
    if (loan && rate && months) {
      const monthlyPayment = (loan * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      const totalPayments = monthlyPayment * months;
      financingCost = totalPayments - loan;
    }

    if (price > 0) {
      const total = price + tax + lawyer + broker + reno + feesCost + financingCost;
      setTotalCost(total);
    } else {
      setTotalCost(null);
    }
  };

  useEffect(() => {
    calculateTotalCost();
  }, [propertyPrice, purchaseTax, lawyerFee, brokerFee, renovation, fees, loanAmount, interestRate, years]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          מחשבון עלות עסקה מלאה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="propertyPriceCost">מחיר נכס (₪)</Label>
          <Input
            id="propertyPriceCost"
            type="number"
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(e.target.value)}
            placeholder="1500000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseTax">מס רכישה (₪)</Label>
          <Input
            id="purchaseTax"
            type="number"
            value={purchaseTax}
            onChange={(e) => setPurchaseTax(e.target.value)}
            placeholder="50000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lawyerFee">שכר טרחת עו״ד (₪)</Label>
          <Input
            id="lawyerFee"
            type="number"
            value={lawyerFee}
            onChange={(e) => setLawyerFee(e.target.value)}
            placeholder="10000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brokerFee">תיווך (₪)</Label>
          <Input
            id="brokerFee"
            type="number"
            value={brokerFee}
            onChange={(e) => setBrokerFee(e.target.value)}
            placeholder="30000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="renovation">שיפוץ (₪)</Label>
          <Input
            id="renovation"
            type="number"
            value={renovation}
            onChange={(e) => setRenovation(e.target.value)}
            placeholder="100000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fees">אגרות ובדיקות (₪)</Label>
          <Input
            id="fees"
            type="number"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            placeholder="5000"
          />
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3">עלות מימון</h4>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="loanAmountCost">סכום הלוואה (₪)</Label>
              <Input
                id="loanAmountCost"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRateCost">ריבית שנתית (%)</Label>
              <Input
                id="interestRateCost"
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="3.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsCost">תקופה (שנים)</Label>
              <Input
                id="yearsCost"
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="25"
              />
            </div>
          </div>
        </div>

        {totalCost !== null && totalCost > 0 && (
          <div className="mt-6 p-6 bg-primary/10 rounded-lg border-2 border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">עלות סופית לרכישה</p>
            <p className="text-3xl font-bold text-primary">
              ₪{totalCost.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-3 pt-3 border-t border-primary/20 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>מחיר נכס</span>
                <span>₪{parseFloat(propertyPrice).toLocaleString('he-IL') || 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>עלויות נלוות</span>
                <span>₪{(totalCost - parseFloat(propertyPrice || "0")).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
