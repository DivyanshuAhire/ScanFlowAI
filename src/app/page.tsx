import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect root to the appointments page as the primary landing page
  redirect('/company/appointments');
  return null;
}
