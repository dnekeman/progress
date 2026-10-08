# Supabase setup

For the existing project, open the Supabase dashboard for `nfkmnfqblkffafnppgdi` and go to **SQL Editor**. If you have not already split the multi-name rows, run `supabase-split-services.sql` exactly once. Then run `supabase-update-status-columns.sql` exactly once to merge the test flags while keeping both deployment columns. Deploy the updated `index.html` to GitHub Pages.

For a new project, run `supabase-setup.sql` instead; it creates the normalized table with all five status fields, seeds all 27 rows, and enables saved ordering. Do not run the fresh setup script on an existing database.

**Anyone can edit:** anyone who can access the public page can change progress and reorder services, and someone could also call the Supabase API directly. The SQL enables row-level security, grants anonymous users read access and update access only to the five progress columns, and does not grant direct permission to alter ordering, add or delete rows, or change service details. Ordering is changed through a validated database function. These writes are not tied to a person and cannot be attributed to an individual.

The status migration combines the old Playwright/load-test flags with OR: either old flag marks `Tests created`. The new `Test successful` and `Live on PRD` checks start false. Existing `ACC` and `PRD` values are retained as `Deployed on ACC` and `Deployed on PRD`.

The publishable key in `index.html` is intended for browser use. Never put a Supabase secret or `service_role` key in the page.

The SQL seeds the service details and the default progress values from the page. Existing progress stored only in a browser's `localStorage` is not automatically imported; compare it with the seeded values before using the shared table.