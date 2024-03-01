import {EOL} from 'node:os'
import { describe, expect, test } from '@jest/globals'
import * as mime from 'mime-types'
import {MIMEMessageHeader} from '../src/MIMEMessageHeader'
import {Mailbox} from '../src/Mailbox'
import { EnvironmentContext } from '../src/MIMEMessage'

// const _reLineSplit = /\r\n|(?!\r\n)[\n-\r\x85\u2028\u2029]/
const envctx: EnvironmentContext = {
    toBase64: function toBase64(data: string) {
        return (Buffer.from(data)).toString('base64')
    },
    toBase64WebSafe: function toBase64WebSafe(data: string) {
        return (Buffer.from(data)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    },
    eol: EOL,
    validateContentType: (v: string) => {
        return mime.lookup(v)
    }
}

describe('MIMEMessageHeader test suite', () => {
    test('header fields', () => {
        const a = new MIMEMessageHeader(envctx)
        expect(a.isHeaderField({})).toBe(false)
        expect(a.isHeaderField({value: 1})).toBe(false)
        expect(a.isHeaderField({name: 'x-header'})).toBe(false)
        expect(a.isHeaderField({name: 'x-header', invalidProp: true})).toBe(false)
        expect(a.isHeaderField({name: 'x-header', value: 'str', dump: '', required: true, disabled: true, generator: '', custom: ''})).toBe(true)
    })

    test('exports header fields as object', () => {
        const a = new MIMEMessageHeader(envctx)
        expect(a.get('Date')).toBe(undefined)
        expect(a.get('Subject')).toBe(undefined)
    })

    test('sets and reads headers', () => {
        const a = new MIMEMessageHeader(envctx)
        a.set('From', new Mailbox('test@test.com'))
        a.set('To', new Mailbox('to@test.com'))
        a.set('Cc', [new Mailbox('cc@test.com'), new Mailbox('cc2@test.com')])
        a.set('Bcc', [new Mailbox('bcc@test.com'), new Mailbox('bcc2@test.com')])
        a.set('Subject', 'Testing')
        a.set('Date', 'Wed, 22 Mar 2023 12:12:02 +0000')
        a.set('Message-ID', '<qjuijvi0ie@test.com>')
        a.set('X-Custom', 'true')
        a.setCustom('X-Something', { value: 'thing'})
        const adump = a.dump()

        expect(a.get('From')).toBeInstanceOf(Mailbox)
        expect(a.get('Subject')).toBe('Testing')
        expect(adump).toBe(
          'Date: Wed, 22 Mar 2023 12:12:02 +0000' + envctx.eol +
          'From: <test@test.com>' + envctx.eol +
          'To: <to@test.com>' + envctx.eol +
          'Cc: <cc@test.com>,' + envctx.eol +
          ' <cc2@test.com>' + envctx.eol +
          'Bcc: <bcc@test.com>,' + envctx.eol +
          ' <bcc2@test.com>' + envctx.eol +
          'Message-ID: <qjuijvi0ie@test.com>' + envctx.eol +
          'Subject: =?utf-8?B?VGVzdGluZw==?=' + envctx.eol +
          'MIME-Version: 1.0' + envctx.eol +
          'X-Custom: true' + envctx.eol +
          'X-Something: thing'
        )
        expect(() => a.setCustom('something', {value: new Mailbox('something')})).toThrow()
        expect(() => a.setCustom('something', {value: new Mailbox('something')})).toThrow()
        expect(() => a.set('Sender', 'some')).toThrow()
        expect(() => a.set('From', [new Mailbox('from@test.com'), new Mailbox('from2@test.com')])).toThrow()
    })
})
