import { pool } from '../config/database.js';

export const upsertAnswer = async (
  { interviewId, questionId, sessionId, answerText },
  client = pool
) => {
  const result = await client.query(
    `
      INSERT INTO interview_answers (
        interview_id,
        question_id,
        session_id,
        answer_text
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (interview_id, question_id)
      DO UPDATE
      SET answer_text = EXCLUDED.answer_text,
          session_id = EXCLUDED.session_id,
          updated_at = NOW()
      RETURNING *
    `,
    [interviewId, questionId, sessionId, answerText]
  );

  return result.rows[0];
};

export const listAnswersByInterviewId = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      SELECT
        a.*,
        q.order_no,
        q.title,
        q.prompt,
        q.category
      FROM interview_answers a
      INNER JOIN interview_questions q ON q.id = a.question_id
      WHERE a.interview_id = $1
      ORDER BY q.order_no ASC
    `,
    [interviewId]
  );

  return result.rows;
};

export const countAnswersByInterviewId = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM interview_answers
      WHERE interview_id = $1
    `,
    [interviewId]
  );

  return result.rows[0]?.total ?? 0;
};
