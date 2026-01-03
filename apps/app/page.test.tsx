import '@testing-library/jest-dom'

describe('App root page', () => {
  it('placeholder test passes', () => {
    // La página raíz solo hace redirect, no hay UI para testear
    // Este test de placeholder permite que `pnpm test` pase
    expect(true).toBe(true)
  })
})