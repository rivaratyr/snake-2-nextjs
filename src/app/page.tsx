import { redirect } from 'next/navigation';
import { AuthButton } from '../components/AuthButton';

export default function Home() {

  if (process.env.USE_LOGIN) {
    redirect('/lobby');
  }

  return (
    <>
    {process.env.NEXT_PUBLIC_ECOSYSTEM === 'world' && (
      <AuthButton />
    )}
    {process.env.NEXT_PUBLIC_ECOSYSTEM === 'farcaster' && (
      <></>
    )}
    </>
  );
}