import { pool } from '../config/database.js';

export const createQuestions = async (interviewId, questions, client = pool) => {
  if (!questions.length) {
    return [];
  }

  const values = [];
  const placeholders = questions.map((question, index) => {
    const baseIndex = index * 8;
    values.push(
      interviewId,
      question.order,
      question.title,
      question.prompt,
      question.category,
      JSON.stringify(question.expectedSignals ?? []),
      question.source ?? 'openai',
      question.model ?? ''
    );

    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}::jsonb, $${baseIndex + 7}, $${baseIndex + 8})`;
  });

  const query = `
    INSERT INTO interview_questions (
      interview_id,
      order_no,
      title,
      prompt,
      category,
      expected_signals,
      source,
      model
    )
    VALUES ${placeholders.join(', ')}
    RETURNING *
  `;

  const result = await client.query(query, values);
  return result.rows;
};

export const listQuestionsByInterviewId = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interview_questions
      WHERE interview_id = $1
      ORDER BY order_no ASC
    `,
    [interviewId]
  );

  return result.rows;
};

export const findQuestionById = async (questionId, client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interview_questions
      WHERE id = $1
      LIMIT 1
    `,
    [questionId]
  );

  return result.rows[0] ?? null;
};
