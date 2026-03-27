import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function renderPage(title: string, message: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: "Plus Jakarta Sans", Arial, sans-serif; background:#f8fafc; color:#0f172a; margin:0; }
      .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { max-width:640px; width:100%; background:white; border:1px solid #e2e8f0; border-radius:20px; padding:32px; box-shadow:0 10px 30px rgba(15,23,42,.08); }
      h1 { margin:0 0 12px; font-size:32px; line-height:1.1; }
      p { margin:0; font-size:16px; line-height:1.7; color:#475569; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const contractorId = searchParams.get('cid');
  const emailLogId = searchParams.get('elid');
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  if (contractorId) {
    const redirectUrl = new URL('/api/track/unsubscribe', origin);
    redirectUrl.searchParams.set('cid', contractorId);
    if (emailLogId) redirectUrl.searchParams.set('elid', emailLogId);
    return NextResponse.redirect(redirectUrl);
  }

  if (!email) {
    return new NextResponse(
      renderPage('Invalid Unsubscribe Link', 'This unsubscribe link is missing the email address. Please contact support@precisegovcon.com and we will remove you manually.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 },
    );
  }

  await prisma.emailSuppression.upsert({
    where: { email },
    update: { reason: 'unsubscribed', source: 'link_click', updatedAt: new Date() },
    create: { email, reason: 'unsubscribed', source: 'link_click' },
  });

  await prisma.contractor.updateMany({
    where: { email },
    data: { pipeline_stage: 'unsubscribed' },
  }).catch(() => {});

  return new NextResponse(
    renderPage('You Have Been Unsubscribed', `We have removed ${email} from future outreach emails. If this was a mistake, contact support@precisegovcon.com.`),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
