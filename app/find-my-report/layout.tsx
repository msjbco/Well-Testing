import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find My Report | Peak to Plains Well Testing',
  description: 'Retrieve your completed well inspection report',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FindMyReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
