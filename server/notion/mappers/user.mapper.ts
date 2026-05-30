import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getTitle, getRichText, getFormula } from '../client'

const EMAIL_DOMAIN = process.env.NOTION_USER_EMAIL_DOMAIN ?? 'tatimar.ca'

export const userMapper = {
  toModel(page: PageObjectResponse) {
    const username = getTitle(page, 'username')
    if (!username) return null

    const email    = username.includes('@') ? username : `${username}@${EMAIL_DOMAIN}`
    const fullName = getRichText(page, 'fullName') || username
    const password = getRichText(page, 'password') || null
    const authId   = getFormula(page, 'authID')

    return { email, name: fullName, password, notionUserId: authId ?? page.id }
  },
}
