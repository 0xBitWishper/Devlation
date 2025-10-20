"use client"

import { useEffect, useState } from "react";
import { SuccessScreen } from "@/components/success-screen";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('devlation.lastBurn');
      if (raw) setData(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const back = () => {
    try { sessionStorage.removeItem('devlation.lastBurn'); } catch (e) {}
    router.push('/dashboard');
  }

  if (!data) return <SuccessScreen onBackToDashboard={back} />;
  return <SuccessScreen onBackToDashboard={back} />;
}
