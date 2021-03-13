dev_api:
	cd api && npm ci && npm start

staging:
	cd api && up staging

deploy:
	cd worker && wrangler publish

logs:
	cd api && up logs