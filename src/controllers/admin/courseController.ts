import { Response } from 'express';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { CustomRequest } from '../../types/common';
import { Course } from '../../models';
import {
  generateCourseId,
  calculateFinalPrice,
  paginate,
  formatResponse,
} from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const findCourseByParam = async (courseId: string) => {
  if (mongoose.Types.ObjectId.isValid(courseId)) {
    const byId = await Course.findById(courseId);
    if (byId) return byId;
  }

  return await Course.findOne({ courseId });
};

/**
 * Create Course
 */
export const createCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const {
    courseName,
    description,
    mentor,
    serviceType,
    startDate,
    endDate,
    price,
    discountPercentage = 0,
    difficultyLevel,
    duration,
    maxParticipants,
    language,
    startTime,
    endTime,
    batchType,
    courseType,
    address,
    countryPricing,
  } = req.body;

  if (!courseName || !mentor || !serviceType || !startDate || !endDate || !price) {
    throw new AppError(400, 'Missing required fields');
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError(400, 'Start date must be before end date');
  }

  const courseId = await generateCourseId(Course);
  const finalPrice = calculateFinalPrice(price, discountPercentage);

  const course = new Course({
    courseId,
    courseName,
    description,
    mentor,
    serviceType,
    startDate,
    endDate,
    price,
    discountPercentage,
    finalPrice,
    difficultyLevel,
    duration,
    maxParticipants,
    capacityRemaining: maxParticipants,
    createdBy: req.user.id,
    language,
    startTime,
    endTime,
    batchType,
    courseType,
    address,
    countryPricing,
  });

  await course.save();

  const response = formatResponse(true, course, 'Course created successfully', 201);
  res.status(201).json(response);
});

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRowKeys = (row: Record<string, any>, keyMap: Record<string, string>) => {
  const normalizedRow: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    const mappedField = keyMap[normalized];
    if (mappedField) {
      normalizedRow[mappedField] = value;
    }
  }
  return normalizedRow;
};

const parseDateValue = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeServiceType = (value: any) => {
  if (!value) return null;
  const key = normalizeKey(String(value));
  const map: Record<string, string> = {
    agile: 'Agile',
    service: 'Service',
    safe: 'SAFe',
    project: 'Project',
    quality: 'Quality',
    business: 'Business',
    generativeai: 'Generative AI',
    genai: 'Generative AI',
  };
  return map[key] || null;
};

const normalizeDifficultyLevel = (value: any) => {
  if (!value) return null;
  const key = normalizeKey(String(value));
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    intermidate: 'Intermediate',
    advanced: 'Advanced',
  };
  return map[key] || null;
};

const parseNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(numberValue) ? null : numberValue;
};

/**
 * Import Courses from Excel
 */
export const importCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!req.file) {
    throw new AppError(400, 'Excel file is required');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new AppError(400, 'No sheets found in the uploaded file');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });

  if (!rows.length) {
    throw new AppError(400, 'No data rows found in the uploaded file');
  }

  const latestCourse = await Course.findOne().sort({ createdAt: -1 });
  let nextNumber = 1001;
  if (latestCourse?.courseId) {
    const parsed = parseInt(latestCourse.courseId.replace('CRS', ''), 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const keyMap: Record<string, string> = {
    coursename: 'courseName',
    course: 'courseName',
    description: 'description',
    mentor: 'mentor',
    mentorname: 'mentor',
    servicetype: 'serviceType',
    type: 'serviceType',
    startdate: 'startDate',
    enddate: 'endDate',
    duration: 'duration',

    // New Fields
    language: 'language',
    starttime: 'startTime',
    endtime: 'endTime',
    batchtype: 'batchType',
    coursetype: 'courseType',
    address: 'address',

    difficultylevel: 'difficultyLevel',
    level: 'difficultyLevel',
    // Removed maxparticipants, generic price/fee
  };

  const coursesToInsert: any[] = [];
  const errors: { row: number; message: string }[] = [];

  // Helper to parse country pricing dynamic columns
  const countryConfigs = [
    { country: "USA", currency: "USD" },
    { country: "Canadian", currency: "CAD" },
    { country: "Europe", currency: "EUR" },
    { country: "India", currency: "INR" },
    { country: "Australia", currency: "AUD" },
    { country: "Singapore", currency: "SGD" }
  ];

  rows.forEach((row, index) => {
    const mapped = normalizeRowKeys(row, keyMap);

    const courseName = mapped.courseName ? String(mapped.courseName).trim() : '';
    const description = mapped.description ? String(mapped.description).trim() : '';
    const mentor = mapped.mentor ? String(mapped.mentor).trim() : '';
    const serviceType = normalizeServiceType(mapped.serviceType);
    const startDate = parseDateValue(mapped.startDate);
    const endDate = parseDateValue(mapped.endDate);

    // Map new fields
    const language = mapped.language ? String(mapped.language).trim() : 'English';
    const startTime = mapped.startTime ? String(mapped.startTime).trim() : '';
    const endTime = mapped.endTime ? String(mapped.endTime).trim() : '';
    const batchType = mapped.batchType ? String(mapped.batchType).trim() : 'Weekdays';
    const courseType = mapped.courseType ? String(mapped.courseType).trim() : 'Online';
    const address = mapped.address ? String(mapped.address).trim() : '';

    const duration = parseNumber(mapped.duration);
    const difficultyLevel = normalizeDifficultyLevel(mapped.difficultyLevel);

    if (!courseName || !description || !mentor || !serviceType || !startDate || !endDate) {
      errors.push({ row: index + 2, message: 'Missing required fields' });
      return;
    }

    if (startDate >= endDate) {
      errors.push({ row: index + 2, message: 'Start date must be before end date' });
      return;
    }

    const courseId = `CRS${nextNumber}`;
    nextNumber += 1;

    // Build countryPricing array from dynamic columns
    const countryPricing = countryConfigs.map(config => {
      const countryKey = normalizeKey(config.country);

      let feeVal = 0;
      let discountVal = 0;
      let finalPriceVal = 0;

      for (const [rKey, rVal] of Object.entries(row)) {
        const normKey = normalizeKey(rKey);

        // Check for Fee (e.g., feeusa)
        if (normKey === `fee${countryKey}`) {
          feeVal = parseNumber(rVal) || 0;
        }
        // Check for Discount (e.g., discountusa)
        if (normKey === `discount${countryKey}`) {
          discountVal = parseNumber(rVal) || 0;
        }
        // Check for Final Price (e.g., priceusa)
        if (normKey === `price${countryKey}`) {
          finalPriceVal = parseNumber(rVal) || 0;
        }
      }

      const calculatedFinal = calculateFinalPrice(feeVal, discountVal);
      const effectiveFinalPrice = finalPriceVal > 0 ? finalPriceVal : calculatedFinal;

      return {
        country: config.country,
        currency: config.currency,
        price: feeVal,
        discountPercentage: discountVal,
        finalPrice: effectiveFinalPrice
      };
    });

    // We need a base price for the main table (often USA price is used as base in listings)
    // Or we can just grab the first country's price as 'default'
    const usaPricing = countryPricing.find(c => c.country === "USA") || countryPricing[0];
    const basePrice = usaPricing ? usaPricing.price : 0;
    const baseDiscount = usaPricing ? usaPricing.discountPercentage : 0;
    const baseFinalPrice = usaPricing ? usaPricing.finalPrice : 0;

    // Address Validations
    let finalAddress = address;
    if (courseType.toLowerCase() === 'online') {
      finalAddress = '';
    }

    coursesToInsert.push({
      courseId,
      courseName,
      description,
      mentor,
      serviceType,
      startDate,
      endDate,

      // Use USA/First Country as "Main" price for listing sorting/display if needed
      price: basePrice,
      discountPercentage: baseDiscount,
      finalPrice: baseFinalPrice,

      difficultyLevel: difficultyLevel ?? undefined,
      duration: duration ?? undefined,
      // Removed maxParticipants
      capacityRemaining: 100, // Default capacity if field removed
      createdBy: req.user.id,
      isActive: true,

      // New inserted fields
      language,
      startTime,
      endTime,
      batchType,
      courseType,
      address: finalAddress,
      countryPricing
    });
  });

  let importedCount = 0;
  if (coursesToInsert.length) {
    const inserted = await Course.insertMany(coursesToInsert, { ordered: false });
    importedCount = inserted.length;
  }

  const response = formatResponse(
    true,
    {
      totalRows: rows.length,
      importedCount,
      failedCount: rows.length - importedCount,
      errors,
    },
    'Courses imported successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get All Courses
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 10, search, serviceType } = req.query;

  const filters: any = {};

  if (search) {
    filters.$or = [
      { courseName: { $regex: search, $options: 'i' } },
      { mentor: { $regex: search, $options: 'i' } },
    ];
  }

  if (serviceType && serviceType !== 'All Types') {
    filters.serviceType = serviceType;
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const courses = await Course.find(filters)
    .skip(skip)
    .limit(pageLimit)
    .sort({ startDate: 1 });

  const total = await Course.countDocuments(filters);

  const response = formatResponse(
    true,
    {
      courses,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Course By ID
 */
export const getCourseById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const course = await findCourseByParam(courseId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  const response = formatResponse(true, course, 'Course retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update Course
 */
export const updateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const course = await findCourseByParam(courseId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  if (req.body.startDate || req.body.endDate) {
    const startDate = new Date(req.body.startDate || course.startDate);
    const endDate = new Date(req.body.endDate || course.endDate);

    if (startDate >= endDate) {
      throw new AppError(400, 'Start date must be before end date');
    }
  }

  Object.assign(course, req.body);
  await course.save();

  const response = formatResponse(true, course, 'Course updated successfully', 200);
  res.status(200).json(response);
});

/**
 * Delete Course
 */
export const deleteCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const course = await findCourseByParam(courseId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  await Course.findByIdAndDelete(course._id);

  const response = formatResponse(true, null, 'Course deleted successfully', 200);
  res.status(200).json(response);
});

/**
 * Activate Course
 */
export const activateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const existing = await findCourseByParam(courseId);

  if (!existing) {
    throw new AppError(404, 'Course not found');
  }

  const course = await Course.findByIdAndUpdate(
    existing._id,
    { isActive: true },
    { new: true }
  );

  const response = formatResponse(true, course, 'Course activated successfully', 200);
  res.status(200).json(response);
});

/**
 * Deactivate Course
 */
export const deactivateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const existing = await findCourseByParam(courseId);

  if (!existing) {
    throw new AppError(404, 'Course not found');
  }

  const course = await Course.findByIdAndUpdate(
    existing._id,
    { isActive: false },
    { new: true }
  );

  const response = formatResponse(true, course, 'Course deactivated successfully', 200);
  res.status(200).json(response);
});
