import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DeepSeekMessage {
  role: 'system' | 'user';
  content: string;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Injectable()
export class DeepSeekIntegrationService {
  private readonly logger = new Logger(DeepSeekIntegrationService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'DEEPSEEK_API_URL',
      'https://api.deepseek.com/v1',
    );
    this.apiKey = this.config.get<string>('DEEPSEEK_API_KEY', '');
  }

  async chat(
    messages: DeepSeekMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 150 } = options || {};

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            temperature,
            max_tokens: maxTokens,
            // Short prompts with tight budgets — hidden reasoning would eat the
            // whole budget and leave `content` empty (see DeepSeekProvider).
            thinking: { type: 'disabled' },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`DeepSeek API error ${response.status}: ${errorBody}`);
        }

        const data: DeepSeekResponse = await response.json();
        return data.choices[0].message.content.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`DeepSeek attempt ${attempt}/3 failed: ${lastError.message}`);

        if (attempt < 3) {
          await this.delay(attempt * 1000);
        }
      }
    }

    throw new InternalServerErrorException(
      `DeepSeek API failed after 3 attempts: ${lastError?.message}`,
    );
  }

  async generateDailyAction(astrologySummary: string): Promise<{
    action: string;
    tone: string;
    element: string;
  }> {
    const prompt = `Sen mistik ama net konusan bir astroloji asistanisin. Kullaniciya bugun icin TEK bir aksiyon onerisi ver.
Asiri teknik terimler kullanma. Turkce konus. Cikti olarak su JSON formatinda don:
{ "action": "eylem cumlesi (max 100 karakter)", "tone": "sakin|enerjik|odakli|yaratici", "element": "su|ates|toprak|hava" }

Bugunun astroloji verisi: ${astrologySummary}`;

    if (!this.apiKey) {
      return this.fallbackDailyAction();
    }

    try {
      const result = await this.chat(
        [
          { role: 'system', content: 'Sen Turkce konusan mistik bir AI asistansin. Cevaplarin JSON formatinda olmali.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.8, maxTokens: 200 },
      );

      const parsed = JSON.parse(result);
      return {
        action: parsed.action || 'Bugun enerjini suya odakla ve niyetini kodla.',
        tone: parsed.tone || 'sakin',
        element: parsed.element || 'su',
      };
    } catch {
      return this.fallbackDailyAction();
    }
  }

  async analyzeResonance(
    affirmationText: string,
  ): Promise<{ resonanceScore: number; clarity: number; emotion: string }> {
    const prompt = `Kullanicinin soyledigi olumlamayi analiz et ve 0-100 arasi bir "rezonans skoru" ver.
Skor kriterleri: inanc seviyesi, ses tonu uyumu (simule), kelimelerin frekansi.
Cikti JSON: { "resonanceScore": 0-100, "clarity": 0-100, "emotion": "pozitif|notr|negatif" }

Olumlama: "${affirmationText}"`;

    if (!this.apiKey) {
      return {
        resonanceScore: Math.round(55 + Math.random() * 40),
        clarity: Math.round(50 + Math.random() * 40),
        emotion: Math.random() > 0.3 ? 'pozitif' : 'notr',
      };
    }

    try {
      const result = await this.chat(
        [
          { role: 'system', content: 'Sen Turkce konusan bir AI asistansin. Cevaplarin JSON formatinda olmali.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.5, maxTokens: 100 },
      );

      const parsed = JSON.parse(result);
      return {
        resonanceScore: Math.min(100, Math.max(0, parsed.resonanceScore || 50)),
        clarity: Math.min(100, Math.max(0, parsed.clarity || 50)),
        emotion: parsed.emotion || 'notr',
      };
    } catch {
      return {
        resonanceScore: Math.round(55 + Math.random() * 40),
        clarity: Math.round(50 + Math.random() * 40),
        emotion: 'notr',
      };
    }
  }

  private fallbackDailyAction() {
    const actions = [
      'Ay Boga burcunda. Finansal konular icin saglam bir gun. Masana bir bardak su al, odaklan ve basla.',
      'Gunes enerjisi yuksek. Bugun fiziksel aktivite icin mukemmel bir frekans. Yuruyuse cik.',
      'Merkur retrosu bitiyor. Iletisim kanallarin aciliyor. Erteledigin maili at.',
      'Venus uyumu aktif. Iliskilerde sicak bir gun. Sevdigine mesaj at.',
    ];
    return {
      action: actions[Math.floor(Math.random() * actions.length)],
      tone: 'sakin',
      element: 'su',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
