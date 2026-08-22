function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: errors },
      });
    }

    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
