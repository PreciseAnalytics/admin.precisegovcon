// app/api/subscriptions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { syncUserWithStripe, getStripeSubscriptionDetails } from '@/lib/stripe-sync';
import { logSubscriptionUpdate } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan_tier: true,
        plan_status: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch live Stripe details if available
    let stripeDetails = null;
    if (user.stripe_subscription_id) {
      stripeDetails = await getStripeSubscriptionDetails(user.stripe_subscription_id);
    }

    return NextResponse.json({
      subscription: user,
      stripeDetails,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// PATCH — manually trigger a Stripe sync for this user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession();

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'sync_stripe') {
      const result = await syncUserWithStripe(params.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Stripe sync failed' }, { status: 500 });
      }
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        select: { id: true, email: true, plan_tier: true, plan_status: true, stripe_customer_id: true, stripe_subscription_id: true },
      });
      return NextResponse.json({ success: true, changed: result.changed, subscription: user });
    }

    if (action === 'update_subscription') {
      const { notes, internal_status, plan_tier, plan_status } = body;
      const session = await requireSession();

      const before = await prisma.user.findUnique({
        where: { id: params.id },
        select: { id: true, plan_tier: true, plan_status: true },
      });
      if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const updateData: any = {};
      if (plan_tier !== undefined) updateData.plan_tier = plan_tier;
      if (plan_status !== undefined) updateData.plan_status = plan_status;
      // notes/internal_status stored as JSON in a meta field if you add one later
      // For now log them in the audit trail

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
        select: { id: true, email: true, plan_tier: true, plan_status: true, stripe_customer_id: true, stripe_subscription_id: true },
      });

      await logSubscriptionUpdate(session.id, params.id, before, { ...updated, notes, internal_status });

      return NextResponse.json({ success: true, subscription: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in subscription PATCH:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}