import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface ExplainCodeOptions {
  depth: number;
  language: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  
  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 5;
  private readonly circuitBreakerTimeout = 30000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }
  }

  async explainCode(code: string, options: ExplainCodeOptions): Promise<string> {
    const { depth, language } = options;
    
    // Validate depth
    if (depth < 1 || depth > 5) {
      throw new Error('Depth must be between 1 and 5');
    }

    // Generate file hash for caching
    const fileHash = this.generateHash(code);
    const cacheKey = `explain:${fileHash}:depth:${depth}`;

    // Check cache first
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      this.logger.log(`Returning cached explanation for depth ${depth}`);
      return cached;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('AI service temporarily unavailable due to repeated failures');
    }

    try {
      const prompt = this.buildPrompt(code, language, depth);
      const maxTokens = this.getMaxTokensByDepth(depth);
      
      const response = await this.callGemini(prompt, maxTokens);
      const explanation = this.extractExplanation(response);

      // Cache the result for 1 hour
      await this.cacheManager.set(cacheKey, explanation, 3600);

      // Reset failure count on success
      this.failureCount = 0;

      return explanation;
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  async getExplanation(repositoryId: string, filePath: string, depth: number): Promise<string> {
    // Check database first
    const existing = await this.prisma.explanation.findUnique({
      where: {
        repositoryId_filePath_depthLevel: {
          repositoryId,
          filePath,
          depthLevel: depth,
        },
      },
    });

    if (existing) {
      this.logger.log(`Returning stored explanation for ${filePath} at depth ${depth}`);
      return existing.content;
    }

    // Get file content
    const file = await this.prisma.projectFile.findUnique({
      where: {
        repositoryId_path: {
          repositoryId,
          path: filePath,
        },
      },
    });

    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Detect language
    const language = this.detectLanguage(filePath);

    // Generate explanation
    const explanation = await this.explainCode(file.content, { depth, language });

    // Store in database
    const fileHash = this.generateHash(file.content);
    await this.prisma.explanation.create({
      data: {
        repositoryId,
        filePath,
        depthLevel: depth,
        content: explanation,
        fileHash,
      },
    });

    return explanation;
  }

  async listExplanations(repositoryId: string): Promise<Array<{
    id: string;
    filePath: string;
    depthLevel: number;
    createdAt: Date;
  }>> {
    const explanations = await this.prisma.explanation.findMany({
      where: { repositoryId },
      select: {
        id: true,
        filePath: true,
        depthLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return explanations;
  }

  private buildPrompt(code: string, language: string, depth: number): string {
    const prompts = {
      1: `Explain this ${language} code simply in 2-3 sentences for a beginner.\n\nCode:\n${code}`,
      2: `Break down this ${language} code function by function. Explain what each part does.\n\nCode:\n${code}`,
      3: `Explain the design patterns, architecture, and data flow in this ${language} code.\n\nCode:\n${code}`,
      4: `Analyze performance, edge cases, potential bugs, and memory usage of this ${language} code.\n\nCode:\n${code}`,
      5: `Senior-level critique of this ${language} code. Architecture flaws, scaling issues, alternative approaches.\n\nCode:\n${code}`,
    };

    return prompts[depth] || prompts[1];
  }

  private getMaxTokensByDepth(depth: number): number {
    const tokenLimits = {
      1: 200,
      2: 500,
      3: 1000,
      4: 1500,
      5: 2000,
    };

    return tokenLimits[depth] || 200;
  }

  private async callGemini(prompt: string, maxTokens: number): Promise<GeminiResponse> {
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      },
    };

    const response = await fetch(`${this.geminiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<GeminiResponse>;
  }

  private extractExplanation(response: GeminiResponse): string {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = response.candidates[0];
    if (!candidate.content?.parts || candidate.content.parts.length === 0) {
      throw new Error('No content parts in Gemini response');
    }

    return candidate.content.parts[0].text.trim();
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'go': 'Go',
      'rs': 'Rust',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
    };

    return languageMap[ext || ''] || 'Unknown';
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private isCircuitBreakerOpen(): boolean {
    if (this.failureCount < this.maxFailures) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastFailureTime > this.circuitBreakerTimeout) {
      // Reset circuit breaker
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  private handleFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    this.logger.error(`AI service failure ${this.failureCount}/${this.maxFailures}: ${error.message}`);
    
    if (this.failureCount >= this.maxFailures) {
      this.logger.warn('Circuit breaker opened due to repeated failures');
    }
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = delays[attempt] || 4000;
        this.logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  async getCircuitBreakerStatus(): Promise<{
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number | null;
  }> {
    return {
      isOpen: this.isCircuitBreakerOpen(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime || null,
    };
  }

  async resetCircuitBreaker(): Promise<void> {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.logger.log('Circuit breaker manually reset');
  }
}
