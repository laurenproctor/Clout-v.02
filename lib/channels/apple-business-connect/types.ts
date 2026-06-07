// lib/channels/apple-business-connect/types.ts
export type {
  ABCCompanyRaw,
  ABCBusinessRaw,
  ABCLocationRaw,
  ABCShowcaseRequest,
  ABCShowcaseResponse,
  ABCShowcaseState,
} from './api-contract'

export interface ABCCredentials {
  keyId:      string
  issuerId:   string
  privateKey: string  // PEM content (.pem file from Apple portal — PKCS8 "BEGIN PRIVATE KEY")
}

export interface ABCCompany {
  id:   string
  name: string
}

export interface ABCBusiness {
  id:        string
  name:      string
  companyId: string
}

export interface ABCLocation {
  id:         string
  name:       string
  companyId:  string
  businessId: string
  address?: {
    city?:            string
    stateOrProvince?: string
  }
}

export class ABCTokenExpiredError extends Error {
  constructor(message = 'ABC credentials rejected — token invalid or expired') {
    super(message)
    this.name = 'ABCTokenExpiredError'
  }
}

export class ABCApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ABCApiError'
  }
}
