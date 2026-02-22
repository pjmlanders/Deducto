import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

export interface ReceiptExtractionResult {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  paymentMethod: string | null;
  category: string | null;
  confidence: number;
  fieldConfidence: {
    vendor: number;
    amount: number;
    date: number;
    items: number;
  };
  rawText: string;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const SUPPORTED_IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Build the appropriate content block for Claude based on the file type.
 * - PDFs are sent as `document` type (Claude natively supports PDF)
 * - Images are sent as `image` type (converting HEIC/TIFF to JPEG if needed)
 */
async function buildFileContentBlock(
  fileBuffer: Buffer,
  mimeType: string
): Promise<Anthropic.Messages.ContentBlockParam> {
  // PDFs: send as document type (Claude has native PDF support)
  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: fileBuffer.toString('base64'),
      },
    };
  }

  // Supported image types: send directly
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType as ImageMediaType,
        data: fileBuffer.toString('base64'),
      },
    };
  }

  // Unsupported image formats (HEIC, TIFF, etc.): convert to JPEG
  const converted = await sharp(fileBuffer).jpeg({ quality: 90 }).toBuffer();
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: converted.toString('base64'),
    },
  };
}

export async function processReceipt(
  fileBuffer: Buffer,
  mimeType: string,
  userCategories: string[]
): Promise<ReceiptExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  const fileContentBlock = await buildFileContentBlock(fileBuffer, mimeType);

  const categoriesList = userCategories.length > 0
    ? userCategories.join(', ')
    : 'General, Office Supplies, Travel, Meals, Utilities, Maintenance, Professional Services, Insurance, Renovations, Furnishings, Operations';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          fileContentBlock,
          {
            type: 'text',
            text: `You are an expert receipt parser. Extract all information from this receipt.

The user's expense categories are: ${categoriesList}

Extract the following and return ONLY valid JSON (no markdown, no explanation):
{
  "vendor": "Store/business name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "currency": "USD",
  "items": [
    {"description": "item name", "quantity": 1, "unitPrice": 0.00, "total": 0.00}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00,
  "paymentMethod": "visa",
  "category": "best matching category from user's list above",
  "confidence": 0.95,
  "fieldConfidence": {
    "vendor": 0.95,
    "amount": 0.98,
    "date": 0.90,
    "items": 0.85
  },
  "rawText": "any additional text or notes on the receipt"
}

Rules:
- If a field is unreadable, set it to null and lower confidence
- Amount should be the TOTAL amount paid
- Date format must be YYYY-MM-DD
- Category must be one of the user's categories listed above
- Confidence should honestly reflect image clarity and extraction certainty
- For paymentMethod use: visa, mastercard, amex, discover, cash, check, debit, or null`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON, handling potential markdown code blocks
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  return JSON.parse(jsonMatch[0]) as ReceiptExtractionResult;
}
