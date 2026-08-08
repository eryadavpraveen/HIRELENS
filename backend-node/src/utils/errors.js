export class AppError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
    this.status = status
    this.detail = detail
  }
}

export function httpError(status, detail) {
  return new AppError(status, detail)
}
