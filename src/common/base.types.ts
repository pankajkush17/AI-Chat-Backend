export type PaginationInput = {
  page: number;
  limit: number;
  filterConditions?: Record<string, unknown>;
};

export interface PrismaModelDelegate {
  findMany(args?: {
    where?: unknown;
    skip?: number;
    take?: number;
    include?: unknown;
    orderBy?: unknown;
  }): Promise<unknown[]>;
  findUnique(args: {
    where: { id: string };
    include?: unknown;
  }): Promise<unknown | null>;
  count(args?: { where?: unknown }): Promise<number>;
  create(args: { data: unknown; include?: unknown }): Promise<unknown>;
  update(args: {
    where: { id: string };
    data: unknown;
    include?: unknown;
  }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  name?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    validatedData?: unknown;
  }
}

export interface IResponseMessages {
  NOT_FOUND: (data: string, id: string) => string;
  UPDATED_SUCCESSFULLY: (data: string) => string;
  CREATED_SUCCESSFULLY: (data: string) => string;
  PAGE_LIMIT_REQUIRED: string;
}

export interface BulkValidationResult<T extends object> {
  item: T;
  errors: Record<string, string[]>;
}
