DBUILD := docker build --network=host --build-arg "http_proxy=$(http_proxy)" --build-arg "https_proxy=$(https_proxy)"

.PHONY: run docker

run:
	@ - tsc
	@ - cd App && node ./QQbot.js ../config.yaml

docker:
	$(DBUILD) -t nobekanai/qqbot .
