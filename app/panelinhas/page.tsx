import { redirect } from 'next/navigation'

export const metadata = { title: 'Panelinhas do YVYs' }

export default function PanelinhasPage() {
  redirect('/mural')
}
