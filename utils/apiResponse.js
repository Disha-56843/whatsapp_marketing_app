// Standardized API response helpers

export const successResponse = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

export const errorResponse = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const validationErrorResponse = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
};