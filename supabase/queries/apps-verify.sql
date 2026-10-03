-- Apps: every row should say ok.
SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'FAILED' END AS result FROM (
  SELECT 'the downloads bucket exists and is public' AS check_name,
         EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'downloads' AND public) AS passed
  UNION ALL
  SELECT 'it only takes Android files and the version note',
         (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'downloads') @> ARRAY['application/vnd.android.package-archive', 'application/json']
) c;
