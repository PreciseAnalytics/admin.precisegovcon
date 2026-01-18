///app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Get the session and verify it exists
    const session = await requireSession();
    
    // If requireSession doesn't throw but returns null/undefined, handle it
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.plan_status = status;
    }

    if (tier) {
      where.plan_tier = tier;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with all required fields
    const usersData = await prisma.user.findMany({
      where,
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
        last_login_at: true,
        is_active: true,
        is_suspended: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    // Map database fields to frontend expectations
    const users = usersData.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.company,
      subscriptionTier: user.plan_tier || 'FREE',
      subscriptionStatus: user.plan_status || 'INACTIVE',
      isActive: user.is_active ?? true,
      isSuspended: user.is_suspended ?? false,
      createdAt: user.created_at.toISOString(),
      lastLoginAt: user.last_login_at?.toISOString() || null,
    }));

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Handle PATCH requests for updating user status (suspend/unsuspend)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireSession();
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const { userId } = params;
    const body = await request.json();
    const { isSuspended, suspendedAt, suspendedReason } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        is_suspended: isSuspended,
        suspended_at: suspendedAt ? new Date(suspendedAt) : null,
        suspended_reason: suspendedReason,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Handle DELETE requests for deleting users
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireSession();
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const { userId } = params;

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}