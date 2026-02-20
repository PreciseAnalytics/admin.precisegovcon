// app/dashboard/subscriptions/[id]/page.tsx
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import prisma from '@/lib/prisma'

interface Props {
  params: { id: string }
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const sub = await prisma.user.findUnique({
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
    },
  })

  if (!sub) return notFound()

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
        <h1 className="text-3xl font-black mb-6">Subscription Details</h1>

        <div className="grid grid-cols-2 gap-6 text-sm font-bold">
          <div>
            <p className="text-slate-500">Name</p>
            <p>{sub.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p>{sub.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Company</p>
            <p>{sub.company || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Plan Tier</p>
            <p>{sub.plan_tier || 'Trial'}</p>
          </div>
          <div>
            <p className="text-slate-500">Plan Status</p>
            <p>{sub.plan_status || 'Trial'}</p>
          </div>
          <div>
            <p className="text-slate-500">Created</p>
            <p>{formatDate(sub.created_at)}</p>
          </div>
          <div>
            <p className="text-slate-500">Stripe Customer ID</p>
            <p>{sub.stripe_customer_id || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Stripe Subscription ID</p>
            <p>{sub.stripe_subscription_id || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}