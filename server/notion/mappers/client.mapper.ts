import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getTitle, getRichText, getSelect, getNumber } from '../client'

export const clientMapper = {
  toModel(page: PageObjectResponse) {
    return {
      name:        getTitle(page, 'Name'),
      type:        getSelect(page, 'Type'),
      address:     getRichText(page, 'Address'),
      city:        getRichText(page, 'City') || null,
      accessNotes: getRichText(page, 'Access Notes') || null,
      contactName: getRichText(page, 'Contact Name') || null,
      contactPhone:getRichText(page, 'Contact Phone') || null,
      frequency:   getSelect(page, 'Frequency'),
      lat:         getNumber(page, 'Latitude'),
      lng:         getNumber(page, 'Longitude'),
      notionSyncedAt: new Date(),
    }
  },
}
