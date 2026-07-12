# Changelog — v0.6.7

## Added

- AI Guide Builder in Admin → Guide.
- Backend endpoint `POST /admin/guides/ai-layout`.
- Backend endpoint `POST /admin/guides/ai-copy-layout`.
- Safe local guide layout assistant that converts admin-provided text into editable guide blocks.
- Hindi layout assistant workflow: copy English layout to Hindi draft, translate, and replace screenshots.
- Image placement suggestions as editable image placeholder blocks.

## Improved

- Guide creation is now faster and more flexible.
- Admin can review and edit all AI-generated blocks before publishing.
- Worker deploy script syntax checks source before deploy.

## Safety

- AI Guide Builder preserves admin-provided official process.
- It must not invent rules, amounts, waiting periods, eligibility, or security requirements.
