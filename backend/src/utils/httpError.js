/** Error ที่มี HTTP status ให้ errorHandler ตอบกลับเป็น JSON */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
