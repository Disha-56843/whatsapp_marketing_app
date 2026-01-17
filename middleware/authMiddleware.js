// import jwt from "jsonwebtoken";

// export const authMiddleware = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Unauthorized" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.userId = decoded.id;
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Invalid Token" });
//   }
// };


import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    // ✅ Support both headers
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.headers["x-auth-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};
