/** 入库管线能解析的格式。文档页的拖放区与问答页的输入器共用同一份。 */
export const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
] as const

/** 说给人看的版本。别把 MIME 类型甩到界面上。 */
export const ACCEPTED_LABEL = 'PDF、Word、Excel、txt、Markdown'

export function isAccepted(file: File): boolean {
  return (ACCEPTED_MIME as readonly string[]).includes(file.type)
}
