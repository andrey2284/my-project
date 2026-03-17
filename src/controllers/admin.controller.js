import { listViolationsByInterviewId } from '../repositories/violations.repository.js';
import {
  createInterviewUseCase,
  getInterviewDetailsUseCase,
  listInterviewsUseCase
} from '../services/interview.service.js';

export const createInterviewController = async (req, res) => {
  const data = await createInterviewUseCase(req.body);

  res.status(201).json({
    success: true,
    data
  });
};

export const listInterviewsController = async (_req, res) => {
  const data = await listInterviewsUseCase();

  res.json({
    success: true,
    data
  });
};

export const getInterviewDetailsController = async (req, res) => {
  const data = await getInterviewDetailsUseCase(req.params.interviewId);

  res.json({
    success: true,
    data
  });
};

export const listViolationsController = async (req, res) => {
  const data = await listViolationsByInterviewId(req.params.interviewId);

  res.json({
    success: true,
    data
  });
};
