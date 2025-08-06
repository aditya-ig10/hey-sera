// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }
    
    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' 
      }, { status: 400 });
    }
    
    // Create FormData for Python backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    if (chatId) {
      backendFormData.append('chatId', chatId);
    }
    
    // Forward to Python backend
    const response = await fetch(`${PYTHON_API_URL}/api/upload`, {
      method: 'POST',
      body: backendFormData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload file',
        success: false
      },
      { status: 500 }
    );
  }
}

// Handle file size limits
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}