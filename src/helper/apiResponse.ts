import { Response } from 'express';

const APIResponse = <T>(resp: Response, status: boolean, statusCode: number, message: string, data?: T | undefined) => {
  const response: { success: boolean; status: number; message: string; data?: T } = {
    success: status,
    status: statusCode,
    message,
  };
  if (data) {
    response.data = data;
  }
  return resp.status(statusCode).json(response);
};

export default APIResponse;