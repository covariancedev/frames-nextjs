/** @jsxImportSource frog/jsx */

import { Frog } from "frog"

export const app = new Frog()

app
    .frame('/end', (c) => {
        return c.error({ message: 'Bad inputs!' })
    })

export default app