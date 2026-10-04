// Every email LocAppoint sends, by queue kind. Add a kind here and a sample in tests/suites/emails.mjs.

import { ACCOUNT } from './account.ts'
import { BOOKING } from './booking.ts'
import { STATEMENT } from './statement.ts'
import { RECEIPT } from './receipt.ts'
import { TRIP } from './trip.ts'
import type { Render } from '../types.ts'

export const RENDER: Record<string, Render> = { ...ACCOUNT, ...BOOKING, ...STATEMENT, ...RECEIPT, ...TRIP }
