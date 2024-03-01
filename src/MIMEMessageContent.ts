import type { EnvironmentContext } from './MIMEMessage'
import { type HeadersObject, MIMEMessageContentHeader, type MIMEMessageHeader } from './MIMEMessageHeader'

export class MIMEMessageContent {
    envctx: EnvironmentContext
    headers
    data

    constructor (envctx: EnvironmentContext, data: string, headers: Record<string, any> = {}) {
        this.envctx = envctx
        this.headers = new MIMEMessageContentHeader(this.envctx)
        this.data = data
        this.setHeaders(headers)
    }

    dump (): string {
        const eol = this.envctx.eol
        return this.headers.dump() + eol + eol + this.data
    }

    isAttachment (): boolean {
        const disposition = this.headers.get('Content-Disposition')
        return typeof disposition === 'string' && disposition.includes('attachment')
    }

    isInlineAttachment (): boolean {
        const disposition = this.headers.get('Content-Disposition')
        return typeof disposition === 'string' && disposition.includes('inline')
    }

    setHeader (name: string, value: any): string {
        this.headers.set(name, value)
        return name
    }

    getHeader (name: string): ReturnType<MIMEMessageHeader['get']> {
        return this.headers.get(name)
    }

    setHeaders (obj: Record<string, any>): string[] {
        return Object.keys(obj).map((prop) => this.setHeader(prop, obj[prop]))
    }

    getHeaders (): HeadersObject {
        return this.headers.toValues()
    }
}
