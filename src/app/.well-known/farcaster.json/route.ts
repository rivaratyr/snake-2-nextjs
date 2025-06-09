// Manifest spec: https://miniapps.farcaster.xyz/docs/specification

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;
  const AWS_CDN_URL = process.env.NEXT_PUBLIC_AWS_CDN_URL;

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: {
      version: process.env.NEXT_PUBLIC_VERSION,
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      homeUrl: URL,
      iconUrl: process.env.NEXT_PUBLIC_ICON_URL,
      imageUrl: process.env.NEXT_PUBLIC_IMAGE_URL,
      buttonTitle: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
      splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL,
      splashBackgroundColor: `#${process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR}`,
      webhookUrl: `${URL}/api/webhook`,
      subtitle: process.env.NEXT_PUBLIC_SUBTITLE,
      description: process.env.NEXT_PUBLIC_DESCRIPTION,
      screenshotUrls: [
        `${AWS_CDN_URL}/snakeduel-screen-1.png`,
        `${AWS_CDN_URL}/snakeduel-screen-2.png`,
        `${AWS_CDN_URL}/snakeduel-screen-3.png`
      ],
      primaryCategory: "games",
      tags: ['snake', 'duel', 'arcade', 'multiplayer'],
      heroImageUrl: `${AWS_CDN_URL}/snakeduel-hero.png`,
      tagline: process.env.NEXT_PUBLIC_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      ogDescription: process.env.NEXT_PUBLIC_DESCRIPTION,
      ogImageUrl: `${AWS_CDN_URL}/snakeduel-hero.png`
    },
  });
}
