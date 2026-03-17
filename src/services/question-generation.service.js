import OpenAI from 'openai';
import { env } from '../config/env.js';
import { extractFirstJsonObject, tryParseJson } from '../utils/json.js';
import { logger } from '../utils/logger.js';
import { buildFallbackQuestions } from './local-question-factory.service.js';

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const buildPrompt = ({ positionTitle, companyContext, totalQuestions }) => `
Сгенерируй ${totalQuestions} вопросов для собеседования на позицию "${positionTitle}".
Требования:
1. Вопросы только для Junior Network Engineer.
2. Вопросы нельзя было бы просто загуглить по ключевым словам.
3. Каждый вопрос должен быть ситуационным, с уникальным контекстом и опорой на рассуждение.
4. Проверяй понимание IP-адресации, маршрутизации, VLAN, ARP, DHCP, DNS, OSI, TCP/UDP.
5. Не задавай вопросы в стиле "дай определение".
6. Используй такой контекст компании: "${companyContext || 'Сеть компании построена преимущественно на MikroTik, есть наследованные настройки и несколько филиалов.'}".
7. Ответ верни ТОЛЬКО в JSON без markdown.

Нужный JSON:
{
  "questions": [
    {
      "order": 1,
      "title": "Короткий заголовок",
      "prompt": "Полный текст вопроса",
      "category": "routing",
      "expectedSignals": ["какие признаки хорошего ответа проверить интервьюеру"]
    }
  ]
}
`;

const normalizeQuestions = (payload, totalQuestions) => {
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];

  return questions.slice(0, totalQuestions).map((question, index) => ({
    order: Number(question.order) || index + 1,
    title: String(question.title ?? `Вопрос ${index + 1}`).trim(),
    prompt: String(question.prompt ?? '').trim(),
    category: String(question.category ?? 'networking').trim().toLowerCase(),
    expectedSignals: Array.isArray(question.expectedSignals)
      ? question.expectedSignals.map((item) => String(item))
      : [],
    source: 'openai',
    model: env.OPENAI_MODEL
  })).filter((question) => question.prompt.length > 0);
};

export const generateInterviewQuestions = async ({
  positionTitle,
  companyContext,
  totalQuestions
}) => {
  if (!client) {
    logger.warn('OPENAI_API_KEY is empty, using fallback questions');
    return buildFallbackQuestions({
      totalQuestions,
      companyContext,
      model: env.OPENAI_MODEL
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.9,
      messages: [
        {
          role: 'developer',
          content:
            'Ты создаёшь сложные, но справедливые вопросы для технических собеседований. Возвращай только валидный JSON.'
        },
        {
          role: 'user',
          content: buildPrompt({ positionTitle, companyContext, totalQuestions })
        }
      ]
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = tryParseJson(text) ?? extractFirstJsonObject(text);
    const normalized = normalizeQuestions(parsed, totalQuestions);

    if (normalized.length >= totalQuestions) {
      return normalized.slice(0, totalQuestions);
    }

    logger.warn({ text }, 'OpenAI response did not contain enough valid questions, using fallback');
    return buildFallbackQuestions({
      totalQuestions,
      companyContext,
      model: env.OPENAI_MODEL
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate questions via OpenAI, using fallback');

    return buildFallbackQuestions({
      totalQuestions,
      companyContext,
      model: env.OPENAI_MODEL
    });
  }
};
