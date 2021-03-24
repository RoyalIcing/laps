dev:
	cd worker && wrangler dev

dev_api:
	cd api && npm ci && npm start

staging:
	cd api && up staging

production:
	cd worker && wrangler publish

deploy: production

logs:
	cd api && up logs