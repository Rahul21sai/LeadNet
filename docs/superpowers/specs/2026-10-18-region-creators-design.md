# Citizens who created issues in a region

The owner requests that a leader select a region and see the citizens who posted issues there. The owner clarified that creators means citizen issue authors. Use the existing officer workspace and its wards as regions; introduce no additional authentication role.

Add Issue creators beside the existing Issue queue. A ward selector controls both. Each anonymous Citizen row shows a ward-scoped reference, the number of distinct issues/posts, latest submission time and links to those public records. Sort by latest activity, not popularity. Support search, loading/error/empty states, keyboard interaction and narrow screens. Reuse warm surfaces, serif display headings, clay actions and restrained user-triggered motion; respect reduced motion.

Connected reads require officer/admin authentication. Officers may read only assigned wards; admins can select any valid ward. Collect canonical report authors and community post authors using server-only records. Deduplicate repeated reports and canonical post projections per citizen/issue. Do not identify supporters/commenters as creators. Never return raw UIDs, private report text/transcripts, contact information, precise positions or media storage paths. No Firestore rule or collection change is needed.

The Vercel demonstration has no cloud author identities. Use explicitly fictional creator associations over existing fictional issue records, without inferring real author identity from public posts. The interface must explain this and keep device activity separate. Real records are excluded from illustrative associations.

No dependencies, cloud deployments or external messages. Existing civic transitions and ledger calculations remain authoritative. Browser-service denial persists: source/automated checks do not establish rendered QA.
