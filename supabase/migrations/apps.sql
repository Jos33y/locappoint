-- Apps: a public bucket for the Android file the website offers while Google Play reviews the app.
-- Codemagic uploads to it with the service key; everyone can download. Safe to run twice.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('downloads', 'downloads', true, 52428800, ARRAY['application/vnd.android.package-archive', 'application/json'])
ON CONFLICT (id) DO UPDATE
   SET public = true,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;
