# Homelab Internal TLS

## Overview

The homelab uses a private Certificate Authority to provide trusted HTTPS
for internal `.home.arpa` services.

External traffic follows:

Browser
→ HTTPS :443
→ Nginx
→ internal service

Requests over HTTP port 80 are redirected to HTTPS.

## Root Certificate Authority

The locally generated root CA is:

- Homelab Root CA
- RSA 4096
- SHA-256
- 10-year lifetime

Generated locally:

- `homelab-root-ca.key`
- `homelab-root-ca.crt`

The CA private key must never be committed or distributed.

## Server Certificate

Nginx uses a certificate containing these Subject Alternative Names:

- dashboard.home.arpa
- portainer.home.arpa
- kuma.home.arpa
- prometheus.home.arpa
- grafana.home.arpa

Generated locally:

- `homelab-server.key`
- `homelab-server.csr`
- `homelab-server.crt`

The certificate is signed by the Homelab Root CA.

## Repository

Safe to commit:

- `tls/README.md`
- `tls/server.cnf`
- `docs/tls.md`

Certificates, CSRs and private keys are generated locally and ignored by Git.

## TLS Termination

TLS terminates at Nginx.

For example:

Browser
→ HTTPS
→ Nginx
→ HTTP
→ Grafana :3000

Traffic between Docker services remains on the private Docker network.

## Monitoring

Uptime Kuma monitors Docker services directly over the internal Docker
network rather than through the public HTTPS endpoints.

Examples:

- Nginx: `http://nginx/healthz`
- Portainer: `http://portainer:9000/api/status`
- Prometheus: `http://prometheus:9090/-/healthy`
- Grafana: `http://grafana:3000/api/health`

This separates application availability monitoring from TLS termination.