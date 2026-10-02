# Supabase setup

1. In the Supabase dashboard for project `nfkmnfqblkffafnppgdi`, open **SQL Editor** and run `supabase-setup.sql`.
2. Deploy `index.html` to GitHub Pages. No sign-in or authentication setup is required.

**Anyone can edit:** anyone who can access the public page can change progress, and someone could also call the Supabase API directly. The SQL enables row-level security, grants anonymous users read access and update access only to the four progress columns, and does not grant permission to add or delete rows or change service details. These writes are not tied to a person and cannot be attributed to an individual.

The publishable key in `index.html` is intended for browser use. Never put a Supabase secret or `service_role` key in the page.

The SQL seeds the service details and the default progress values from the page. Existing progress stored only in a browser's `localStorage` is not automatically imported; compare it with the seeded values before using the shared table.