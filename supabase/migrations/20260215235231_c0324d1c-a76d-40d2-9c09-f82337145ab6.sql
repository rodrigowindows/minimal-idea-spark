ALTER TABLE public.nw_pipeline_templates RENAME TO nw_templates;
NOTIFY pgrst, 'reload schema';