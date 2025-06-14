import { auth } from '@/auth';
import { redirect } from 'next/navigation';
// import { Navigation } from '@/components/Navigation';
// import { Page } from '@/components/PageLayout';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If the user is not authenticated, no answer is returned.
  if (!session) {
    console.log(session);
    console.log('Not authenticated');
    return (<></>);
  }

  return (
    <>
      {children}
    </>
  );
}
