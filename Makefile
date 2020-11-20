deploy_staging:
	cd api && up staging

deploy:
	cd worker && wrangler publish
