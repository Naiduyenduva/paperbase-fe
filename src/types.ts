export type User = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type AuthResponse = {
  token: string
  user: User
}
