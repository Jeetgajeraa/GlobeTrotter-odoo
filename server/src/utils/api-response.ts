export interface ApiResponse {
  success: boolean;
  message: string;
  data: Object | Object[] | null;
}

export const createResponse = (success: boolean, message: string, data: any ): ApiResponse => {
  return {
    success,
    message,
    data: data
  };
};
