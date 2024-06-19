/** @jsxImportSource @airstack/frog/jsx */

import { Frog } from "@airstack/frog"

export const app = new Frog()

app
    .frame('/end', (c) => {
        return c.error({ message: 'Bad inputs!' })
    })

export default app