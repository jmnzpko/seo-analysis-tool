import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const requestLog = new Map<string, number[]>();
const MAX_REQUESTS_PER_HOUR = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const requests = requestLog.get(ip) || [];
  const recentRequests = requests.filter(time => time > oneHourAgo);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }
  
  recentRequests.push(now);
  requestLog.set(ip, recentRequests);
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }

  try {
    const { primaryKeyword, city, state, highRankingUrl, lowRankingUrl } = req.body;

    if (!primaryKeyword || !city || !state || !highRankingUrl || !lowRankingUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('CLAUDE_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = buildAnalysisPrompt({
      primaryKeyword,
      city,
      state,
      highRankingUrl,
      lowRankingUrl,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    return res.status(200).json({
      success: true,
      analysis: responseText,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    return res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
    });
  }
}

function buildAnalysisPrompt(data: {
  primaryKeyword: string;
  city: string;
  state: string;
  highRankingUrl: string;
  lowRankingUrl: string;
}): string {
  return `You are an SEO analyst focused exclusively on Google ranking signals, not user experience.

Your task is to evaluate content purely from Google's perspective, identifying what content elements exist on a top-ranking local car accident lawyer page that are missing or underrepresented on a weaker page.

**IMPORTANT RULES:**
- Ignore whether content is engaging or readable for users
- Assume the primary audience is search engine algorithms
- Analyze only on-page content and headings
- Do NOT consider: backlinks, page speed, UX, design, conversions, schema, internal/external links

**Analysis Parameters:**
- Primary Keyword: ${data.primaryKeyword}
- Target Location: ${data.city}, ${data.state}
- High-Ranking Page URL: ${data.highRankingUrl}
- Low-Ranking Page URL: ${data.lowRankingUrl}

**Evaluation Criteria (Algorithmic Lens):**

1️⃣ **Keyword & Entity Coverage**
- Primary keyword variants
- Secondary and supporting entities (legal concepts, accident types, insurance terminology)
- Geographic entity saturation for ${data.city}, ${data.state}

2️⃣ **Topical Completeness**
- Coverage of expected subtopics for a local car accident lawyer page
- Missing legal, procedural, or contextual sections

3️⃣ **Heading Signals**
- H1/H2/H3 patterns aligned with SERP leaders
- Missing topic clusters

4️⃣ **Content Depth Signals**
- Section depth (thin vs developed)
- Explanatory blocks reinforcing topical authority

---

**OUTPUT STRUCTURE (REQUIRED):**

## A) Algorithmically Important Content on the High-Ranking Page

List topics, headings, and content blocks contributing to ranking strength. Explain WHY each element matters algorithmically.

## B) Missing or Weak Content Signals on the Low-Ranking Page

List specific content gaps relative to the high-ranking page. Be precise about what is missing and where it should appear.

## C) Search-Engine-Optimized Content Additions

For each gap, provide:
- **Suggested Heading** (H1/H2/H3 level specified)
- **Content Block** (1-2 paragraphs written to):
  - Reinforce topical authority
  - Expand legal + geographic entity coverage
  - Increase semantic redundancy

**Content Requirements:**
- Neutral and informational
- Redundant where useful for algorithms
- Written for search engines, not persuasion
- No fluff or marketing language
- No competitor mentions

**Constraints:**
- Do NOT optimize for readability
- Do NOT remove repetition if it reinforces entities
- Focus purely on algorithmic signals

---

Begin your analysis now.`;
}
