import type { Metadata } from "next";
import { MovingPlanner } from "@/components/MovingPlanner";
export const metadata: Metadata = { title: "Moving between states", description: "Combine origin and destination driving and vehicle tasks in a source-linked moving checklist." };
export default function MovingPage() {
  return <div className="page-shell shell"><header className="page-intro moving-intro"><p className="eyebrow">Across state lines</p><h1>Make your move.<br />Keep the paperwork together.</h1><p>License transfers, vehicle registration, and departure rules depend on where you’re coming from and where you’re going.</p></header><MovingPlanner /></div>;
}
