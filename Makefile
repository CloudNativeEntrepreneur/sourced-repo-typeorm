up:
	docker-compose up -d

down:
	docker-compose down --remove-orphans

watch-integration-tests:
	npm run test:integration:watch

integration-tests:
	make up
	sleep 5
	npm run test:integration
	make down