import { NextRequest, NextResponse } from 'next/server';
import { requireSession, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logUserUpdate, logUserDeletion, createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  plan_tier: z.string().optional(),
  plan_status: z.string().optional(),
  is_active: z.boolean().optional(),
  is_suspended: z.boolean().optional(),
});


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
        plan: true,
        plan_tier: true,
        plan_status: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        is_active: true,
        is_suspended: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const updates = updateUserSchema.parse(body);

    // Get current user data for audit
    const currentUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan_tier: true,
        plan_status: true,
        is_active: true,
        is_suspended: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updates,
    });

    // Log the update
    await logUserUpdate(
      session.id,
      params.id,
      currentUser,
      updatedUser
    );

    // Log specific suspend/unsuspend actions
    if (updates.is_suspended !== undefined && updates.is_suspended !== currentUser.is_suspended) {
      await createAuditLog({
        adminUserId: session.id,
        action: updates.is_suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
        entityType: 'User',
        entityId: params.id,
        changesBefore: { is_suspended: currentUser.is_suspended },
        changesAfter: { is_suspended: updates.is_suspended },
      });
    }

    // Log specific activate/deactivate actions
    if (updates.is_active !== undefined && updates.is_active !== currentUser.is_active) {
      await createAuditLog({
        adminUserId: session.id,
        action: updates.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'User',
        entityId: params.id,
        changesBefore: { is_active: currentUser.is_active },
        changesAfter: { is_active: updates.is_active },
      });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();

    // Get user data for audit before deletion
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan_tier: true,
        plan_status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Log deletion
    await logUserDeletion(session.id, params.id, user);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}