DBUILD := docker build --network=host --build-arg "http_proxy=$(http_proxy)" --build-arg "https_proxy=$(https_proxy)"

.PHONY: run docker

run:
	@ - tsc
	@ - node ./App/QQbot.js

docker:
	$(DBUILD) -t nobekanai/qqbot .
