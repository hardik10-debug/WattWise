
import { useEffect, useState } from "react";
import {
  getProperties,
  getMeters,
  getBills,
  getConsumption,
} from "../services/api";

function useDashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    meters: 0,
    consumption: null,
    latestBill: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [propertiesRes, metersRes, billsRes] =
          await Promise.all([
            getProperties(),
            getMeters(),
            getBills(),
          ]);

        const properties = propertiesRes.data ?? [];
        const meters = metersRes.data ?? [];
        const bills = billsRes.data ?? [];

        let consumption = null;

        if (meters.length > 0) {
          const response = await getConsumption(meters[0].id);
          const intervals = response.data ?? [];

          const validIntervals = intervals.filter(
            (item) =>
              item.calculation?.success === true &&
              Number.isFinite(
                Number(item.calculation?.consumption)
              )
          );

          if (validIntervals.length > 0) {
            consumption = validIntervals.reduce(
              (total, item) =>
                total + Number(item.calculation.consumption),
              0
            );
          }
        }

        const sortedBills = [...bills].sort((a, b) => {
          const dateA = new Date(
            a.created_at ?? a.billing_end_date ?? 0
          ).getTime();

          const dateB = new Date(
            b.created_at ?? b.billing_end_date ?? 0
          ).getTime();

          return dateB - dateA;
        });

        setStats({
          properties: properties.length,
          meters: meters.length,
          consumption,
          latestBill:
            sortedBills.length > 0 &&
            Number.isFinite(Number(sortedBills[0].bill_amount))
              ? Number(sortedBills[0].bill_amount)
              : null,
        });
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return { stats, loading, error };
}

export default useDashboard;
