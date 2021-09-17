# Freebox gateway

[![pipeline status](https://github.com/Smeagolworms4/freebox-gateway/actions/workflows/build_images.yml/badge.svg)](https://github.com/Smeagolworms4/freebox-gateway/actions/workflows/build_images.yml)

Its Api proxy for freebox api without authentifacation.
You can use with Home Assistant or orther

## Usage

Pull repository

```bash
docker pull smeagolworms4/freebox-gateway
```


Run container:

```bash
docker run -p 3333:3333 -v$(pwd)/config:/app/config smeagolworms4/freebox-gateway
```

## Environment variables

```
HTTP_PORT=3333
API_BASE_URL=http://mafreebox.freebox.fr/api
```

## Docker hub

https://hub.docker.com/r/smeagolworms4/freebox-gateway
