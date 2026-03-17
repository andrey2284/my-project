import { pool } from '../config/database.js';

export const createInterview = async ({
  candidateName,
  candidateEmail,
  positionTitle,
  companyContext,
  totalQuestions,
  maxViolations,
  metadata = {}
}) => {
  const query = `
    INSERT INTO interviews (
      candidate_name,
      candidate_email,
      position_title,
      company_context,
      total_questions,
      max_violations,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING *
  `;

  const values = [
    candidateName,
    candidateEmail,
    positionTitle,
    companyContext,
    totalQuestions,
    maxViolations,
    JSON.stringify(metadata)
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findInterviewById = async (interviewId, client = pool) => {
  const result = await client.query('SELECT * FROM interviews WHERE id = $1 LIMIT 1', [interviewId]);
  return result.rows[0] ?? null;
};

export const findInterviewByAccessToken = async (accessToken, client = pool) => {
  const result = await client.query('SELECT * FROM interviews WHERE access_token::text = $1 LIMIT 1', [accessToken]);
  return result.rows[0] ?? null;
};

export const findInterviewByRecruiterRoomToken = async (roomToken, client = pool) => {
  const result = await client.query(
    'SELECT * FROM interviews WHERE recruiter_room_token::text = $1 LIMIT 1',
    [roomToken]
  );
  return result.rows[0] ?? null;
};

export const lockInterviewById = async (interviewId, client) => {
  const result = await client.query('SELECT * FROM interviews WHERE id = $1 FOR UPDATE', [interviewId]);
  return result.rows[0] ?? null;
};

export const updateInterviewStatus = async (
  interviewId,
  status,
  { startedAt, finishedAt, violationCount } = {},
  client = pool
) => {
  const result = await client.query(
    `
      UPDATE interviews
      SET
        status = COALESCE($2, status),
        started_at = COALESCE($3, started_at),
        finished_at = COALESCE($4, finished_at),
        violation_count = COALESCE($5, violation_count)
      WHERE id = $1
      RETURNING *
    `,
    [interviewId, status, startedAt ?? null, finishedAt ?? null, violationCount ?? null]
  );

  return result.rows[0] ?? null;
};

export const listInterviews = async (client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interviews
      ORDER BY created_at DESC
    `
  );
  return result.rows;
};
