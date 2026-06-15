export class PaginationDto {
  page?: number = 1;
  limit?: number = 20;
}

export class ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;

  constructor(data: T) {
    this.success = true;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}
