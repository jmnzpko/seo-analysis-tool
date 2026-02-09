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

Your task is to evaluate content purely from Google's perspective, identifying what content elements exist on a top-ranking local car accident lawyer page or personal injury lawyer page that are missing or underrepresented on a weaker page.

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

Okay, now that you have analyzed the content from the competitor you just scanned, write the content in a new article.

Your goal is to produce a full, high-quality draft that covers ALL of the topics, sections, and themes that the competitor page is addressing, while remaining completely original (do not copy wording or structure verbatim).

When determining tone of voice, style, and positioning, use **our firms tone and voice as reflected in the low-ranking URL I shared with you**. That page represents how our firm communicates and should be used as the baseline for voice, style, and ethos.

---

## WRITING CONSIDERATIONS (FOLLOW STRICTLY)

When writing, keep the following in mind at all times:

- My target audience
- Appropriate tone and voice for my brand and that target audience
- Readability level: **8th grade**
- If you are writing content for a practice area page, the first sections must address what people actively looking for an attorney want to know first (e.g., how we can help, what compensation may include, what to do next), not general educational information
- Ensure the heading order flows naturally from section to section and tells a clear, logical story

---

## REQUIRED ELEMENTS TO INCORPORATE

You must incorporate ALL of the following:

### E-E-A-T
Include clear signals of experience, expertise, authority, and trust without fabricating facts, statistics, relationships, or case results.

### Local Entities & Authoritative References
Reference relevant local or legal entities where appropriate.  
You may reference authoritative sources such as .gov, .edu, or other reputable institutions **only when relevant and accurate**.  
Do NOT make up statistics, studies, or unsupported claims.  
Do NOT link to competitors.

Bad example:  
“Links to expert witness resources can be found through the California State University system’s research departments.”

Good example:  
“Courts evaluate these claims based on evidence and expert testimony, sometimes supported by research from institutions like UCLA on quality of life after serious injury.”

### Information Gain
Add meaningful depth beyond generic content by clarifying:
- processes
- decision points
- factors that affect outcomes
- pitfalls to avoid
- practical considerations relevant to the topic

### Hypothetical Scenarios & Case Examples
You may include hypothetical scenarios throughout the content where relevant.  
If actual case examples are provided in Project Knowledge, you may include them as-is.  
Do NOT imply that hypothetical scenarios are real firm cases.

### Tables
Only include tables if they genuinely add value.  
Do not use tables that simply repeat or summarize content already explained in paragraphs.

---

## CTA REQUIREMENTS

Include single CTA sentences in a **bolded, italicized, centrally aligned blockquote** format.

- First, link to the URLs provided in the CTA links above
- Once those are used, link to the Contact Us page
- Do NOT link to blog posts in CTA sections
- Scatter CTAs at the end of relevant sections to avoid crowding the content

---

## SECTION FORMATTING RULES

For each section, use ONE of the following formats that best matches the header:

- An initial paragraph of **45–50 words** that directly answers the header (you may expand with additional paragraphs if necessary)
- A brief introduction followed by an ordered list (maximum of 2 sentences per list item)
- A brief introduction followed by an unordered list (maximum of 2 sentences per list item)
- Paragraph sections should aim for a **maximum of 3 paragraphs**

---

## FINAL SECTION REQUIREMENTS

### Final CTA Section (H2)
Include this as your final H2 (reword the heading as a hook).

This section should:
- Be client-focused
- Shift emphasis away from what the reader must “know” or “understand”
- Emphasize how our firm guides, advises, and supports clients

---

## FAQs (REQUIRED)

Include **5 FAQs as H3s** at the end of the article.

Rules:
- Each FAQ must address a completely different pain point NOT covered elsewhere in the content
- Each answer must be an initial paragraph of 45 to 50 words
- Focus on practical, case-specific, or procedural questions
- Optimize for local relevance and logical question flow
- Do NOT repeat topics already covered in the main body

---

Write the full article now, following all instructions above.`;
}
