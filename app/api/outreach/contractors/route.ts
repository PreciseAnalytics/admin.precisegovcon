import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Mock SAM.gov contractor data
    // In production, this would fetch from SAM.gov API
    const mockContractors = [
      {
        id: '1',
        name: 'Advanced IT Solutions LLC',
        email: 'contact@advanceditsolutions.com',
        company: 'Advanced IT Solutions LLC',
        businessType: 'IT Services',
        registrationDate: '2024-01-15',
        samgovId: 'SAM123456',
        contacted: false,
        enrolled: false,
        contactAttempts: 0,
      },
      {
        id: '2',
        name: 'Government Consulting Partners',
        email: 'sales@govcons ultingpartners.com',
        company: 'Government Consulting Partners',
        businessType: 'Management Consulting',
        registrationDate: '2024-01-20',
        samgovId: 'SAM123457',
        contacted: true,
        enrolled: false,
        contactAttempts: 1,
      },
      {
        id: '3',
        name: 'Federal Technology Inc',
        email: 'business@fedtech.com',
        company: 'Federal Technology Inc',
        businessType: 'Software Development',
        registrationDate: '2024-01-25',
        samgovId: 'SAM123458',
        contacted: true,
        enrolled: true,
        contactAttempts: 1,
      },
      {
        id: '4',
        name: 'Defense Contractor Services',
        email: 'inquiry@defensecontractors.com',
        company: 'Defense Contractor Services',
        businessType: 'Defense & Security',
        registrationDate: '2024-02-01',
        samgovId: 'SAM123459',
        contacted: false,
        enrolled: false,
        contactAttempts: 0,
      },
      {
        id: '5',
        name: 'Infrastructure Solutions Group',
        email: 'contact@infrasolutions.com',
        company: 'Infrastructure Solutions Group',
        businessType: 'Infrastructure',
        registrationDate: '2024-02-05',
        samgovId: 'SAM123460',
        contacted: false,
        enrolled: false,
        contactAttempts: 0,
      },
    ];

    // Filter by search term
    let filtered = mockContractors;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = mockContractors.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.company.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
    const contractors = filtered.slice(0, limit);

    return NextResponse.json({
      contractors,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
}
