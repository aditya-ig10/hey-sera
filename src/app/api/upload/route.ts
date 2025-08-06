import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;

    if (!file) return NextResponse.json({ error: 'No file provided', success: false }, { status: 400 });

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large', success: false }, { status: 400 });

    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension))
      return NextResponse.json({ error: `Unsupported file type: ${fileExtension}`, success: false }, { status: 400 });

    const backendFormData = new FormData();
    backendFormData.append('file', file);
    if (chatId) backendFormData.append('chatId', chatId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${PYTHON_API_URL}/api/upload`, {
      method: 'POST',
      body: backendFormData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || 'Backend error', success: false }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ ...data, success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file', success: false },
      { status: 500 }
    );
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};