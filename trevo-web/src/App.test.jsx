import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders Trevo Web text', () => {
    render(<App />)
    expect(screen.getByText(/Trevo Web/i)).toBeInTheDocument()
  })
})