import { pool } from '../config/database.js';

export const createViolation = async (
  { interviewId, sessionId, type, message, source, payload = {}, countSnapshot },
  client = pool
) => {
  const result = await client.query(
    `
      INSERT INTO interview_violations (
        interview_id,
        session_id,
        type,
        message,
        source,
        payload,
        count_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING *
    `,
    [interviewId, sessionId, type, message, source, JSON.stringify(payload), countSnapshot]
  );

  return result.rows[0];
};

export const listViolationsByInterviewId = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interview_violations
      WHERE interview_id = $1
      ORDER BY created_at DESC
    `,
    [interviewId]
  );

  return result.rows;
};
