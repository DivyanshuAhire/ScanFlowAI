import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await dbConnect();
    const state = mongoose.connection.readyState;
    
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const states: { [key: number]: string } = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

    return NextResponse.json({
      status: states[state] || 'Unknown',
      readyState: state,
      dbName: mongoose.connection.name,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'Error',
      error: error.message,
    }, { status: 500 });
  }
}
