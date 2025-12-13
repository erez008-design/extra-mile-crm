import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

export const ROICalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<string>("");
  const [monthlyRent, setMonthlyRent] = useState<string>("");
  const [yearlyExpenses, setYearlyExpenses] = useState<string>("");
  const [grossROI, setGrossROI] = useState<number | null>(null);
  const [netROI, setNetROI] = useState<number | null>(null);

  const calculateROI = () => {
    const price = parseFloat(propertyPrice);
    const rent = parseFloat(monthlyRent);
    const expenses = parseFloat(yearlyExpenses);

    if (price && rent) {
      const yearlyRent = rent * 12;
      const grossReturn = (yearlyRent / price) * 100;
      setGrossROI(grossReturn);

      if (expenses >= 0) {
        const netYearlyIncome = yearlyRent - expenses;
        const netReturn = (netYearlyIncome / price) * 100;
        setNetROI(netReturn);
      } else {
        setNetROI(null);
      }
    } else {
      setGrossROI(null);
      setNetROI(null);
    }
  };

  useEffect(() => {
    if (propertyPrice && monthlyRent) {
      calculateROI();
    }
  }, [propertyPrice, monthlyRent, yearlyExpenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          מחשבון תשואה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="propertyPrice">מחיר הנכס (₪)</Label>
          <Input
            id="propertyPrice"
            type="number"
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(e.target.value)}
            placeholder="1500000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyRent">שכר דירה חודשי (₪)</Label>
          <Input
            id="monthlyRent"
            type="number"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
            placeholder="5000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearlyExpenses">הוצאות שנתיות (₪)</Label>
          <Input
            id="yearlyExpenses"
            type="number"
            value={yearlyExpenses}
            onChange={(e) => setYearlyExpenses(e.target.value)}
            placeholder="10000"
          />
          <p className="text-xs text-muted-foreground">אחזקה, ארנונה, ביטוח, ועד בית</p>
        </div>
        {grossROI !== null && grossROI > 0 && (
          <div className="space-y-3 mt-6">
            <div className="p-6 bg-primary/10 rounded-lg border-2 border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">תשואה ברוטו</p>
              <p className="text-3xl font-bold text-primary">
                {grossROI.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                הכנסה שנתית: ₪{(parseFloat(monthlyRent) * 12).toLocaleString('he-IL')}
              </p>
            </div>
            {netROI !== null && (
              <div className="p-6 bg-secondary/10 rounded-lg border-2 border-secondary/20">
                <p className="text-sm text-muted-foreground mb-2">תשואה נטו</p>
                <p className="text-3xl font-bold text-secondary-foreground">
                  {netROI.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  רווח שנתי: ₪{((parseFloat(monthlyRent) * 12) - parseFloat(yearlyExpenses)).toLocaleString('he-IL')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
