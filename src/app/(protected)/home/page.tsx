import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { FarcasterHeader } from '@/components/FarcasterHeader';
import HomeContent from '@/components/HomeLayout';

// import { Pay } from '@/components/Pay';
// import { Transaction } from '@/components/Transaction';
// import { UserInfo } from '@/components/UserInfo';
// import { Verify } from '@/components/Verify';
// import { ViewPermissions } from '@/components/ViewPermissions';

export default async function Home() {
  const session = await auth();

  return (
    <>
      {process.env.NEXT_PUBLIC_ECOSYSTEM === 'world' && (
        <>
          <Page.Header className="p-0">
            <TopBar
              title="Home"
              endAdornment={
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold capitalize">
                    {session?.user.username}
                  </p>
                  <Marble src={session?.user.profilePictureUrl} className="w-12" />
                </div>
              }
            />
          </Page.Header>
          <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
            <HomeContent />
          </Page.Main>
        </>
      )}
      {process.env.NEXT_PUBLIC_ECOSYSTEM === 'farcaster' && (
        <>
          <FarcasterHeader />
          <HomeContent />
        </>
      )}
    </>
  );
}