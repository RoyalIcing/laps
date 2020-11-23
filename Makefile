deploy_staging:
	cd api && up staging

deploy:
	cd worker && wrangler publish

logs:
	cd api && up logs