# Freebox gateway

[![pipeline status](https://github.com/Smeagolworms4/freebox-gateway/actions/workflows/build_images.yml/badge.svg)](https://github.com/Smeagolworms4/freebox-gateway/actions/workflows/build_images.yml)

It's Api proxy for freebox api without authentifacation.
You can use with Home Assistant or other

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
APP_ID=fr.freebox_gateway
APP_NAME="Freebox Gateway"
APP_VERSION=1.0.0
DEVICE_NAME="Freebox Gateway"
```


## Register freebox app token

Call with browser

```
http://127.0.0.1:3333/register
```

or curl

```
curl http://127.0.0.1:3333/register
```

And valid on your freebox


![Freebox validation](https://raw.githubusercontent.com/Smeagolworms4/freebox-gateway/master/docs/config_freebox.png)


## Docker hub

https://hub.docker.com/r/smeagolworms4/freebox-gateway

## Github

https://github.com/Smeagolworms4/freebox-gateway
