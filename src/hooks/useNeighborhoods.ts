import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Static neighborhoods dictionary (base data)
const STATIC_NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  "רחובות": [
    "אושיות",
    "אזור תעשיה",
    "אזורי ויצמן",
    "אחוזת הנשיא",
    "אפרים",
    "גבעת האהבה",
    "גבעתי",
    "גינות סביון",
    "גן הפקאן",
    "גני דיזנגוף",
    "דניה",
    "ההולנדית",
    "הפרחים",
    "חבצלת",
    "חצרות המושבה",
    "כפר גבירול",
    "מזרח",
    "מילצן",
    "מקוב",
    "מרכז",
    "מרמורק",
    "נוה עמית",
    "נווה יהודה",
    "סלע",
    "פארק הורוביץ",
    "פארק המדע",
    "צפון מזרח",
    "צפון מערב",
    "קרית דוד",
    "קרית ההגנה",
    "קרית היובל",
    "קרית משה",
    "רחובות החדשה",
    "רחובות המדע",
    "רחובות הצעירה",
    "רמת אהרון",
    "רמת יגאל",
    "שילר",
    "שעריים"
  ],

  "נס ציונה": [
    "א.ת.",
    "ארגמן",
    "גבעת הצבר",
    "גבעת התור",
    "גבעת מיכאל",
    "גבעת נוף",
    "גני איריס",
    "גני הדרים",
    "הדגל",
    "הדרי סמל",
    "וואלי",
    "טירת שלום",
    "יד אליעזר",
    "כפר אהרון",
    "לב המושבה",
    "מרכז מזרח",
    "מרכז מערב",
    "נווה כרמית",
    "סביוני הפארק",
    "סביוני נצר",
    "עמידר",
    "פארק המדע",
    "פארק מדע",
    "פסגת סלע",
    "צפון נס ציונה",
    "רמת בן צבי",
    "רמת סמל",
    "שמורת מליבו"
  ],

  "מזכרת בתיה": [
    "בר לב",
    "המושבה",
    "מ.בתיה",
    "נאות יצחק רבין",
    "נאות ראשונים"
  ],

  "יבנה": [
    "א.ת דרום",
    "א.ת צפוני",
    "התעשיה",
    "יבנה הירוקה",
    "נאות אשכול",
    "נאות בגין",
    "נאות גוריון",
    "נאות רבין",
    "נאות שזר",
    "נאות שמיר",
    "נווה אילן",
    "רמות בן צבי",
    "רמות ויצמן"
  ]
};

export interface AdminNeighborhoodAddition {
  id: string;
  city_name: string;
  neighborhood_name: string;
  created_at: string;
}

export const useNeighborhoods = () => {
  const [fullNeighborhoodsByCity, setFullNeighborhoodsByCity] = useState<Record<string, string[]>>(STATIC_NEIGHBORHOODS_BY_CITY);
  const [adminAdditions, setAdminAdditions] = useState<AdminNeighborhoodAddition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndMergeNeighborhoods = async () => {
    setLoading(true);
    try {
      // Fetch admin additions
      const { data, error } = await supabase
        .from("admin_neighborhood_additions")
        .select("*")
        .order("city_name", { ascending: true });

      if (error) {
        console.error("Error fetching admin neighborhood additions:", error);
        setFullNeighborhoodsByCity(STATIC_NEIGHBORHOODS_BY_CITY);
        return;
      }

      setAdminAdditions(data || []);

      // Merge static + dynamic
      const merged: Record<string, string[]> = {};
      
      // Start with static data
      for (const [city, neighborhoods] of Object.entries(STATIC_NEIGHBORHOODS_BY_CITY)) {
        merged[city] = [...neighborhoods];
      }

      // Add dynamic entries from admin_neighborhood_additions
      for (const addition of (data || [])) {
        if (!merged[addition.city_name]) {
          merged[addition.city_name] = [];
        }
        // Only add if not already exists (avoid duplicates)
        if (!merged[addition.city_name].includes(addition.neighborhood_name)) {
          merged[addition.city_name].push(addition.neighborhood_name);
        }
      }

      // Sort neighborhoods alphabetically within each city
      for (const city of Object.keys(merged)) {
        merged[city].sort((a, b) => a.localeCompare(b, "he"));
      }

      setFullNeighborhoodsByCity(merged);
    } catch (err) {
      console.error("Error in fetchAndMergeNeighborhoods:", err);
      setFullNeighborhoodsByCity(STATIC_NEIGHBORHOODS_BY_CITY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndMergeNeighborhoods();
  }, []);

  return {
    neighborhoodsByCity: fullNeighborhoodsByCity,
    adminAdditions,
    loading,
    refetch: fetchAndMergeNeighborhoods,
  };
};

// Export static data for reference
export const STATIC_NEIGHBORHOODS = STATIC_NEIGHBORHOODS_BY_CITY;
