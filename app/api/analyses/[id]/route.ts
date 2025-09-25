import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisResult } from '@/lib/vercel-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const result = await getAnalysisResult(analysisId);

    if (!result) {
      return NextResponse.json(
        { status: 'processing', message: 'Analysis not found or still processing' },
        { status: 202 }
      );
    }

    return NextResponse.json({
      status: 'completed',
      result,
      analysisId
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { status: 'failed', error: 'Failed to retrieve analysis' },
      { status: 500 }
    );
  }
}