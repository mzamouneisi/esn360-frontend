import { beforeEach, describe, expect, it } from 'vitest'
import { clearToken, getToken, setToken } from './token'

const TOKEN_KEY = 'soc360_token'

describe('token', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renvoie null quand aucun token n’est stocké', () => {
    expect(getToken()).toBeNull()
  })

  it('stocke et relit le token', () => {
    setToken('abc.def.ghi')
    expect(getToken()).toBe('abc.def.ghi')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc.def.ghi')
  })

  it('écrase le token précédent', () => {
    setToken('premier')
    setToken('second')
    expect(getToken()).toBe('second')
  })

  it('supprime le token', () => {
    setToken('abc')
    clearToken()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
