# QQbot

A stupid bot.

## How to start?

```bash
make init
```

Edit the `config.yaml` or configure the appropriate environment variables, then

```bash
make run
```

## Production

Example `docker-compose.yml`:

```yaml
version: "3"

services:
  qqbot:
    image: nobekanai/qqbot
    container_name: qqbot
    restart: unless-stopped
    volumes:
      - ./config.yaml:/config.yaml:ro
      - ./data:/data
    environment:
      - DATA_DIR=/data
```

Copy `config.yaml` to the current directory, edit the configuration file and start the service, note that you may not want to change the `data_dir` as it corresponds to the value of the environment variable above.
