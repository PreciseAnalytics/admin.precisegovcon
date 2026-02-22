// app/api/marketing/opportunity-alerts/route.ts
// Automated email alerts for matching contractors

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { opportunityId } = await request.json();
    
    // Get opportunity details
    const opp = await sql`
      SELECT * FROM cached_opportunities WHERE id = ${opportunityId}
    `;
    
    if (opp.rows.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }
    
    const opportunity = opp.rows[0];
    
    // Find matching contractors based on NAICS and set-aside
    let contractorsQuery;
    
    if (opportunity.set_aside) {
      contractorsQuery = await sql`
        SELECT name, email, business_type 
        FROM contractors 
        WHERE naics_code = ${opportunity.naics_code}
        AND business_type ILIKE ${'%' + opportunity.set_aside + '%'}
        AND email IS NOT NULL
        AND unsubscribed = false
        LIMIT 100
      `;
    } else {
      contractorsQuery = await sql`
        SELECT name, email, business_type 
        FROM contractors 
        WHERE naics_code = ${opportunity.naics_code}
        AND email IS NOT NULL
        AND unsubscribed = false
        LIMIT 100
      `;
    }
    
    const contractors = contractorsQuery;
    
    // Send personalized emails
    for (const contractor of contractors.rows) {
      await resend.emails.send({
        from: 'PreciseGovCon <alerts@precisegovcon.com>',
        to: contractor.email,
        subject: `🔔 New ${opportunity.set_aside || ''} Opportunity: ${opportunity.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${contractor.name},</h2>
            
            <p>A new federal opportunity matching your profile has been posted:</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${opportunity.title}</h3>
              <p><strong>Agency:</strong> ${opportunity.agency}</p>
              <p><strong>Value:</strong> ${opportunity.value}</p>
              <p><strong>Deadline:</strong> ${new Date(opportunity.response_deadline).toLocaleDateString()}</p>
              ${opportunity.set_aside ? `<p><strong>Set-Aside:</strong> ${opportunity.set_aside}</p>` : ''}
              <p><strong>NAICS:</strong> ${opportunity.naics_code}</p>
            </div>
            
            <p>Ready to pursue this opportunity? PreciseGovCon can help you:</p>
            
            <ul>
              <li>Prepare a winning proposal</li>
              <li>Track similar opportunities</li>
              <li>Connect with teaming partners</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://precisegovcon.com/opportunities/${opportunity.id}?ref=email" 
                 style="background: #ed8936; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Full Details →
              </a>
            </div>
            
            <p style="color: #718096; font-size: 14px;">
              You're receiving this because you registered with PreciseGovCon and 
              match this opportunity's requirements.
            </p>
          </div>
        `,
      });
    }
    
    // Track the campaign
    await sql`
      INSERT INTO email_campaigns (opportunity_id, sent_count, sent_at)
      VALUES (${opportunityId}, ${contractors.rows.length}, NOW())
    `;
    
    return NextResponse.json({ 
      success: true, 
      sent: contractors.rows.length 
    });
    
  } catch (error) {
    console.error('[marketing] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send alerts' },
      { status: 500 }
    );
  }
}