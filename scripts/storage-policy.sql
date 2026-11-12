CREATE POLICY "Allow anon upload student-ids" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'student-ids');

CREATE POLICY "Allow anon read student-ids" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'student-ids');
