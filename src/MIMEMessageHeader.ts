import type { EnvironmentContext } from './MIMEMessage'
import { MIMETextError } from './MIMETextError.js'
import { Mailbox } from './Mailbox.js'

/*
    Headers are based on: https://www.rfc-editor.org/rfc/rfc4021#section-2.1
    (Some are ignored as they can be added later or as a custom header.)
*/

export class MIMEMessageHeader {
    envctx: EnvironmentContext
    protected fields: HeaderFields = {
        Date: {
            generator: () => ((new Date()).toUTCString()).replace(/GMT|UTC/gi, '+0000')
        },
        From: {
            required: true,
            validate: (v: unknown) => this.validateMailboxSingle(v),
            dump: (v: Mailbox) => this.dumpMailboxSingle(v)
        },
        Sender: {
            validate: (v: unknown) => this.validateMailboxSingle(v),
            dump: (v: Mailbox) => this.dumpMailboxSingle(v)
        },
        'Reply-To': {
            validate: (v: unknown) => this.validateMailboxSingle(v),
            dump: (v: Mailbox) => this.dumpMailboxSingle(v)
        },
        To: {
            validate: (v: unknown) => this.validateMailboxMulti(v),
            dump: (v: Mailbox[]) => this.dumpMailboxMulti(v)
        },
        Cc: {
            validate: (v: unknown) => this.validateMailboxMulti(v),
            dump: (v: Mailbox[]) => this.dumpMailboxMulti(v)
        },
        Bcc: {
            validate: (v: unknown) => this.validateMailboxMulti(v),
            dump: (v: Mailbox[]) => this.dumpMailboxMulti(v)
        },
        'Message-ID': {
            generator: () => {
                const randomstr = Math.random().toString(36).slice(2)
                const from = this.fields.From?.value
                const domain = from?.getAddrDomain()
                return '<' + randomstr + '@' + domain + '>'
            }
        },
        Subject: {
            required: true,
            dump: (v: unknown) => {
                return typeof v === 'string' ? '=?utf-8?B?' + this.envctx.toBase64(v) + '?=' : ''
            }
        },
        'MIME-Version': {
            generator: () => '1.0'
        }
    }

    constructor (envctx: EnvironmentContext) {
        this.envctx = envctx
    }

    dump (): string {
        let lines = ''

        for (const [name, field] of Object.entries(this.fields)) {
            if (!this.isHeaderField(field)) continue
            if (field.disabled) continue
            const isValueDefinedByUser = field.value !== undefined && field.value !== null
            if (!isValueDefinedByUser && field.required) {
                throw new MIMETextError('MIMETEXT_MISSING_HEADER', `The "${name}" header is required.`)
            }
            if (!isValueDefinedByUser && typeof field.generator !== 'function') continue
            if (!isValueDefinedByUser && typeof field.generator === 'function') field.value = field.generator()
            const strval = Object.hasOwn(field, 'dump') && typeof field.dump === 'function' && field.value
                ? field.dump(field.value)
                : typeof field.value === 'string' ? field.value : ''
            lines += `${name}: ${strval}${this.envctx.eol}`
        }

        return lines.slice(0, -1 * this.envctx.eol.length)
    }

    toValues (): HeadersObject {
        return Object.entries(this.fields).reduce((memo: HeadersObject, [key, headerField]) => {
            memo[key] = headerField.value
            return memo
        }, {})
    }

    get<T extends keyof HeaderFields> (name: T): ExplicitHeaderFieldValueTypes<T> | undefined {
        return this.fields[name]?.value
    }

    set (name: keyof HeaderFields, value: any): HeaderField {
        const isCustomHeader = !Object.hasOwn(this.fields, name)

        if (!isCustomHeader) {
            // const ind = this.fields.findIndex(fieldMatcher)
            const field = this.fields[name]
            if (field.validate && !field.validate(value)) {
                throw new MIMETextError('MIMETEXT_INVALID_HEADER_VALUE', `The value for the header "${name}" is invalid.`)
            }
            this.fields[name].value = value
            return this.fields[name]
        }

        return this.setCustom(name, {
            value,
            custom: true,
            dump: (v: unknown) => typeof v === 'string' ? v : ''
        })
    }

    setCustom (name: string, obj: any): HeaderField {
        if (this.isHeaderField(obj)) {
            if (typeof obj.value !== 'string') {
                throw new MIMETextError('MIMETEXT_INVALID_HEADER_FIELD', 'Custom header must have a value.')
            }
            this.fields[name] = obj
            return obj
        }

        throw new MIMETextError('MIMETEXT_INVALID_HEADER_FIELD', 'Invalid input for custom header. It must be in type of HeaderField.')
    }

    validateMailboxSingle (v: unknown): v is Mailbox {
        return v instanceof Mailbox
    }

    validateMailboxMulti (v: unknown): boolean {
        return v instanceof Mailbox || this.isArrayOfMailboxes(v)
    }

    dumpMailboxMulti (v: Mailbox[]): string {
        const dump = (item: Mailbox): string => item.name.length === 0
            ? item.dump()
            : `=?utf-8?B?${this.envctx.toBase64(item.name)}?= <${item.addr}>`
        return this.isArrayOfMailboxes(v) ? v.map(dump).join(`,${this.envctx.eol} `) : dump(v)
    }

    dumpMailboxSingle (v: Mailbox): string {
        const dump = (item: Mailbox): string => item.name.length === 0
            ? item.dump()
            : `=?utf-8?B?${this.envctx.toBase64(item.name)}?= <${item.addr}>`
        return v instanceof Mailbox ? dump(v) : ''
    }

    isHeaderField (v: unknown): v is HeaderField {
        function isValidProp (prop: string): boolean {
            const validProps = ['value', 'dump', 'required', 'disabled', 'generator', 'custom']

            return validProps.includes(prop)
        }
        if (this.isObject(v)) {
            if ('value' in v) {
                const value = v.value
                if (!(typeof value === 'string' || value instanceof Mailbox || (Array.isArray(value) && value[0] instanceof Mailbox))) {
                    return false
                }
            }

            const keys = Object.keys(v)
            if (keys.some(isValidProp)) {
                return true
            }
        }
        return false
    }

    isObject (v: unknown): v is object {
        return (!!v) && (v.constructor === Object)
    }

    isArrayOfMailboxes (v: unknown): v is Mailbox[] {
        return this.isArray(v) && v.every((item) => item instanceof Mailbox)
    }

    isArray (v: unknown): v is any[] {
        return (!!v) && (v.constructor === Array)
    }
}

export class MIMEMessageContentHeader extends MIMEMessageHeader {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    override fields = {
        'Content-ID': {},
        'Content-Type': {},
        'Content-Transfer-Encoding': {},
        'Content-Disposition': {}
    }

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (envctx: EnvironmentContext) {
        super(envctx)
    }
}

export type HeadersObject = Record<string, string | Mailbox | Mailbox[] | undefined>

export type ExplicitHeaderFieldNames = 'Date' | 'From' | 'Sender' | 'Reply-To' | 'To' | 'Cc' | 'Bcc' | 'Message-ID' | 'Subject' | 'MIME-Version'
export type ExplicitHeaderFieldValueTypes<T> =
    T extends 'From' | 'Sender' | 'Reply-To' ? Mailbox :
        T extends 'To' | 'Cc' | 'Bcc' ? Mailbox[] : string
// export type HeaderReturnType<T = ExplicitHeaderFieldNames> = ExplicitHeaderFieldValueTypes<T>
export type MappedHeaderTypes<T extends ExplicitHeaderFieldNames> = {
    [K in T]: HeaderField<ExplicitHeaderFieldValueTypes<K>> | undefined
}
export type HeaderFields = MappedHeaderTypes<ExplicitHeaderFieldNames> & Record<string, any>

export interface HeaderField<T = string | Mailbox | Mailbox[]> {
    // name: string
    dump?: (v: T) => string
    value?: T
    validate?: (v: unknown) => boolean
    required?: boolean
    disabled?: boolean
    generator?: () => string
    custom?: boolean
}
