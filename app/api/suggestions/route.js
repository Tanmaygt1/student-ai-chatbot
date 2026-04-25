import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    suggestions: [
      "What B.Tech courses are offered at VIT?",
      "What are the fees at VIT Pune?",
      "Tell me about placements at VIT",
      "How to apply for admission?",
      "What is the highest package at VIT?",
      "Computer Engineering department details",
      "Hostel and campus facilities?",
      "Contact VIT admission office"
    ]
  });
}
