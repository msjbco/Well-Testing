// Next.js API route for reports by jobId
// This queries Supabase directly to avoid routing conflicts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    // Initialize Supabase with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`🔍 Loading report for job ${jobId} from Supabase...`);
    
    const { data, error } = await supabase
      .from('well_reports')
      .select('*')
      .eq('job_id', jobId)
      .single();
    
    if (error) {
      console.error('❌ Error loading report:', error);
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to load report', details: error.message },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Found report for job ${jobId}`);
    
    // Map Supabase format to expected format
    const report = {
      id: data.id,
      jobId: data.job_id,
      job_id: data.job_id,
      createdAt: data.created_at,
      created_at: data.created_at,
      updatedAt: data.updated_at,
      updated_at: data.updated_at,
      // Wrap report fields in 'data' property for admin site compatibility
      data: {
        flowReadings: data.flow_readings || [],
        flow_readings: data.flow_readings || [],
        waterQuality: data.water_quality || {},
        water_quality: data.water_quality || {},
        photos: data.photos || [],
        notes: data.notes || '',
        recommendations: data.recommendations || '',
        wellBasics: data.well_basics || {},
        well_basics: data.well_basics || {},
        systemEquipment: data.system_equipment || {},
        system_equipment: data.system_equipment || {},
      },
      // Also include fields directly for backward compatibility
      flow_readings: data.flow_readings || [],
      flowReadings: data.flow_readings || [],
      water_quality: data.water_quality || {},
      waterQuality: data.water_quality || {},
      photos: data.photos || [],
      notes: data.notes || '',
      recommendations: data.recommendations || '',
      well_basics: data.well_basics || {},
      wellBasics: data.well_basics || {},
      system_equipment: data.system_equipment || {},
      systemEquipment: data.system_equipment || {},
    };
    
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error in GET /api/reports/job/[jobId]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

