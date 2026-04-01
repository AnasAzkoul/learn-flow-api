import {
  NotFoundError,
  ForbiddenError,
} from "../errors/index.js";
import * as courseRepo from "../repositories/course.repository.js";
import { buildPaginationMeta } from "../utils/pagination.js";
import type { PaginationParams } from "../utils/pagination.js";
import type { UpdateCourseInput } from "../validators/course.validators.js";

export async function getCoursesByUser(
  userId: string,
  params: PaginationParams,
) {
  const { data, total } = await courseRepo.findAllByUserId(userId, params);

  return {
    courses: data,
    meta: buildPaginationMeta(params.page, params.limit, total),
  };
}

export async function getCourseById(id: string, userId: string) {
  const result = await courseRepo.findById(id);

  if (!result) {
    throw new NotFoundError("Course not found");
  }

  if (result.userId !== userId) {
    throw new ForbiddenError("You do not have access to this course");
  }

  return result;
}

export async function updateCourse(
  id: string,
  userId: string,
  data: UpdateCourseInput,
) {
  const existing = await courseRepo.findById(id);

  if (!existing) {
    throw new NotFoundError("Course not found");
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError("You do not have access to this course");
  }

  const updated = await courseRepo.updateById(id, data);

  if (!updated) {
    throw new NotFoundError("Course not found");
  }

  return updated;
}

export async function deleteCourse(id: string, userId: string) {
  const existing = await courseRepo.findById(id);

  if (!existing) {
    throw new NotFoundError("Course not found");
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError("You do not have access to this course");
  }

  await courseRepo.removeById(id);
}
