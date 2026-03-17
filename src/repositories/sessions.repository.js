import { pool } from '../config/database.js';

export const findActiveSessionByInterviewId = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interview_sessions
      WHERE interview_id = $1
        AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [interviewId]
  );

  return result.rows[0] ?? null;
};

export const findSessionById = async (sessionId, client = pool) => {
  const result = await client.query(
    `
      SELECT *
      FROM interview_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId]
  );

  return result.rows[0] ?? null;
};

export const createSession = async (
  { interviewId, cameraVerified, ipAddress, userAgent, deviceInfo = {} },
  client = pool
) => {
  const result = await client.query(
    `
      INSERT INTO interview_sessions (
        interview_id,
        camera_verified,
        ip_address,
        user_agent,
        device_info
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
    `,
    [interviewId, cameraVerified, ipAddress, userAgent, JSON.stringify(deviceInfo)]
  );

  return result.rows[0];
};

export const touchSession = async (sessionId, client = pool) => {
  const result = await client.query(
    `
      UPDATE interview_sessions
      SET last_activity_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [sessionId]
  );

  return result.rows[0] ?? null;
};

export const closeActiveSessionsForInterview = async (interviewId, client = pool) => {
  const result = await client.query(
    `
      UPDATE interview_sessions
      SET ended_at = NOW()
      WHERE interview_id = $1
        AND ended_at IS NULL
      RETURNING *
    `,
    [interviewId]
  );

  return result.rows;
};
