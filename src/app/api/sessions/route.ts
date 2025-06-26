import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Function to generate session title from code
function generateSessionTitle(code: string, language: string): string {
  if (!code || code.trim().length === 0) {
    return `New ${language} Session`;
  }

  // Remove comments and empty lines
  const cleanCode = code
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Filter out empty lines and common comment patterns
      if (!line) return false;
      if (line.startsWith('//')) return false;
      if (line.startsWith('/*')) return false;
      if (line.startsWith('*')) return false;
      if (line.startsWith('#')) return false;
      if (line.startsWith('<!--')) return false;
      return true;
    })
    .join(' ');

  // Extract meaningful words (first 3-5 words)
  const words = cleanCode
    .replace(/[{}();,\[\]"'`]/g, ' ') // Remove common code symbols
    .split(/\s+/)
    .filter(word => {
      // Filter out common keywords and short words
      const commonKeywords = ['import', 'from', 'const', 'let', 'var', 'function', 'class', 'export', 'default', 'return', 'if', 'else', 'for', 'while', 'do', 'try', 'catch', 'async', 'await'];
      return word.length > 2 && !commonKeywords.includes(word.toLowerCase());
    })
    .slice(0, 4); // Take first 4 meaningful words

  if (words.length === 0) {
    return `${language.charAt(0).toUpperCase() + language.slice(1)} Code`;
  }

  // Create title from words
  let title = words.join(' ');
  
  // Limit title length
  if (title.length > 30) {
    title = title.substring(0, 27) + '...';
  }

  return title;
}

export async function POST(request: NextRequest) {
  try {
    const { code, language, initialMessage, githubRepo } = await request.json();
    
    // Generate meaningful title from code
    const sessionTitle = generateSessionTitle(code || '', language || 'javascript');
    
    const session = await prisma.codeSession.create({
      data: {
        code,
        language: language || 'javascript',
        title: sessionTitle,
        githubRepo,
        messages: {
          create: initialMessage ? [{
            content: initialMessage,
            type: 'USER'
          }] : []
        }
      },
      include: {
        messages: true
      }
    });
    
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessions = await prisma.codeSession.findMany({
      include: {
        messages: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}