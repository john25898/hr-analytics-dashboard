import type { Metadata } from "next";
import { RecruitmentContent } from "@/components/recruitment-content";

export const metadata: Metadata = {
  title: "Recruitment pipeline | CHAK HR management",
  description:
    "Every requisition, stage, source and milestone in one operating view.",
};

export default function RecruitmentPage() {
  return <RecruitmentContent />;
}
