import { Request, Response } from "express";
import {
  CustomError,
  NotFoundError,
  UnprocessableEntityError,
} from "../errors";
import { PrismaClient } from "@prisma/client";
import prisma from "../models/prismaClient";
import responseMessages from "./base.messages";
import { PrismaModelDelegate, IResponseMessages } from "./base.types";

export abstract class BaseController {
  protected readonly prisma: PrismaClient;
  protected readonly model: PrismaModelDelegate;
  protected readonly responseMessages: IResponseMessages;

  constructor(model: unknown) {
    this.prisma = prisma;
    this.model = model as PrismaModelDelegate;
    this.responseMessages = responseMessages;
  }

  /**
   * Fetch all records for the model with pagination and filtering.
   */
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const page = Number.parseInt(req.body?.page as string) || 1;
      const limit = Number.parseInt(req.body?.limit as string) || 10;
      const skip = (page - 1) * limit;
      const filters = this.getFilters(req);
      const include = this.getInclude(req);
      const orderBy = this.getOrderBy(req);

      const records = await this.model.findMany({
        where: filters,
        skip,
        take: limit,
        include: include || undefined,
        orderBy: orderBy || undefined,
      });

      const totalRecords = await this.model.count({ where: filters });

      const data = this.useTransformData()
        ? await this.transformData(records, "index", req)
        : records;
      const totalPages = Math.ceil(totalRecords / limit);
      const isNextPage = page + 1 <= totalPages;
      const isPrevPage = page - 1 > 0;

      res.status(200).json({
        status: "success",
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          nextPage: isNextPage,
          prevPage: isPrevPage,
        },
        data: data,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Fetch all records for the model without pagination.
   * Dynamically handles filters from both params and body.
   */
  public async showAll(req: Request, res: Response): Promise<void> {
    try {
      const include = this.getInclude(req);
      const bodyFilters = this.getFilters(req);

      const paramFilters: Record<string, unknown> = {};
      Object.keys(req.params).forEach((key) => {
        if (key !== "id" && req.params[key]) {
          paramFilters[key] = req.params[key];
        }
      });

      const whereClause = { ...bodyFilters, ...paramFilters };

      const [records, totalRecords] = await Promise.all([
        this.model.findMany({
          where: whereClause,
          include: include || undefined,
        }),
        this.model.count({ where: whereClause }),
      ]);
      res
        .status(200)
        .json({ status: "success", totalCount: totalRecords, data: records });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Fetch a single record by ID for the model.
   */
  public async show(req: Request, res: Response): Promise<void> {
    const id = (req.params.id as string) || "";
    try {
      const include = this.getInclude(req);

      const record = await this.model.findUnique({
        where: { id },
        include: include || undefined,
      });

      if (!record) {
        throw new NotFoundError(
          this.responseMessages.NOT_FOUND(this.model.name as string, id),
        );
      }

      res.status(200).json({ status: "success", data: record });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create a new record for the model.
   */
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.validatedData || req.body;
      const transformData = await this.transformData(data, "create", req);
      const include = this.getInclude(req);

      const record = await this.model.create({
        data: {
          ...(transformData as Record<string, unknown>),
        },
        include: include || undefined,
      });

      await this.afterSave("create", record, req);

      res.status(201).json({
        status: "success",
        message: this.responseMessages.CREATED_SUCCESSFULLY(
          this.model.name as string,
        ),
        data: record,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update a record for the model.
   */
  public async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    try {
      const data = req.validatedData || req.body;
      const transformData = await this.transformData(data, "update", req);
      const include = this.getInclude(req);

      const record = await this.model.findUnique({ where: { id } });
      if (!record) {
        throw new NotFoundError(
          this.responseMessages.NOT_FOUND(this.model.name as string, id),
        );
      }

      const updatedRecord = await this.model.update({
        where: { id },
        data: {
          ...(transformData as Record<string, unknown>),
        },
        include: include || undefined,
      });

      res.status(200).json({
        status: "success",
        message: this.responseMessages.UPDATED_SUCCESSFULLY(
          this.model.name as string,
        ),
        data: updatedRecord,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete a record for the model.
   */
  public async destroy(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    try {
      const record = await this.model.findUnique({ where: { id } });
      if (!record) {
        throw new NotFoundError(
          this.responseMessages.NOT_FOUND(this.model.name as string, id),
        );
      }

      await this.model.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handle errors gracefully.
   */
  protected handleError(error: unknown, res: Response): void {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.json());
    } else {
      const internalError = new UnprocessableEntityError(
        (error as Error).message,
      );
      res.status(internalError.statusCode).json(internalError.json());
    }
  }

  protected getFilters(req: Request): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    const query = req.body?.filterConditions;
    if (!query) return filters;

    const relationFilters = this.getRelationFilters();

    Object.keys(query).forEach((key) => {
      if (relationFilters[key] && Array.isArray(query[key])) {
        const targetField = relationFilters[key];
        filters[key] = {
          some: {
            [targetField]: { in: query[key] },
          },
        };
      } else if (key !== "search") {
        filters[key] = query[key];
      }
    });

    if (query.search) {
      const searchableFields = this.getSearchableFields();
      if (searchableFields.length > 0) {
        filters.OR = searchableFields.map((field) => ({
          [field]: { contains: query.search, mode: "insensitive" },
        }));
      }
    }

    return filters;
  }

  /**
   * Override this in child controllers to define searchable fields.
   */
  protected getSearchableFields(): string[] {
    return [];
  }

  /**
   * Extract include relations from request body.
   */
  protected getInclude(req: Request): Record<string, unknown> | null {
    const include = req.body?.include;
    return include && typeof include === "object" ? include : null;
  }

  /**
   * Check if transformData should be called for 'index' method.
   * Override in child controllers that need special handling for 'index'.
   */
  protected useTransformData(): boolean {
    return false;
  }

  /**
   * Transform data before sending the response.
   * Override in child controllers to inject extra fields.
   */
  protected transformData(
    data: unknown,
    _method?: string,
    _req?: Request,
  ): unknown {
    return data;
  }

  protected getOrderBy(
    req: Request,
  ): Record<string, "asc" | "desc"> | undefined {
    const orderBy = req.body?.orderBy;
    const order = this.getOrder(req);

    if (orderBy && typeof orderBy === "object") {
      this.validateOrderByKeys(Object.keys(orderBy));
      return orderBy;
    }

    if (typeof orderBy === "string" && order) {
      this.validateOrderByKeys([orderBy]);
      return { [orderBy]: order };
    }

    return { createdAt: "desc" };
  }

  protected getOrder(req: Request): "asc" | "desc" | undefined {
    const order = req.body?.order;

    if (order && order !== "asc" && order !== "desc") {
      throw new UnprocessableEntityError(
        `Invalid order value '${order}'. Allowed values are: 'asc', 'desc'`,
      );
    }

    return order === "asc" || order === "desc" ? order : undefined;
  }

  /**
   * Validate that orderBy keys exist in the model schema.
   * Throws UnprocessableEntityError if any key doesn't exist.
   */
  protected validateOrderByKeys(keys: string[]): void {
    const validFields = this.getValidOrderByFields();

    for (const key of keys) {
      if (!validFields.includes(key)) {
        throw new UnprocessableEntityError(
          `Invalid orderBy key '${key}'. Valid keys are: ${validFields.join(", ")}`,
        );
      }
    }
  }

  /**
   * Get valid fields that can be used for ordering.
   * Override in child controllers to customize valid fields.
   */
  protected getValidOrderByFields(): string[] {
    return ["id", "createdAt", "updatedAt"];
  }

  protected async afterSave(
    _method: "create" | "update",
    _record: unknown,
    _req?: Request,
  ): Promise<void> {
    // Override in child controllers to add post-save logic
  }

  /**
   * Override in child controllers to define relation filters.
   * Key = filter name in request, Value = target field inside the relation.
   * Example: { roles: "roleId" }
   */
  protected getRelationFilters(): Record<string, string> {
    return {};
  }
}
