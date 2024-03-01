import { MIMEMessage } from '../MIMEMessage'

const envctx = {
    toBase64: function toBase64 (data: string) {
        return Utilities.base64Encode(data, Utilities.Charset.UTF_8)
    },
    toBase64WebSafe: function toBase64WebSafe (data: string) {
        return Utilities.base64EncodeWebSafe(data)
    },
    eol: '\r\n',
    validateContentType: (v: string): string | false => {
        return v.length > 0 ? v : false
    }
}

export function createMimeMessage (): MIMEMessage {
    return new MIMEMessage(envctx)
}

export { MIMEMessage } from '../MIMEMessage'
export { Mailbox } from '../Mailbox'
export { MIMETextError } from '../MIMETextError'
export { MIMEMessageHeader } from '../MIMEMessageHeader'
export { MIMEMessageContent } from '../MIMEMessageContent'

export type * from '../MIMEMessage'
export type * from '../Mailbox'
export type * from '../MIMETextError'
export type * from '../MIMEMessageHeader'
export type * from '../MIMEMessageContent'
