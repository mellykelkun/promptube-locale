# syntax=docker/dockerfile:1.7

FROM golang:1.25.12-alpine3.23@sha256:cc985ef6f9c3bf9ece7488129c9abe0a150388ccdfa428d886fc709dca0b230a AS builder

ARG MINIO_SOURCE_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
ARG MINIO_SOURCE_SHA256=45521908307306e925c98d629e1c17d78c8b72b6ee242b1bfb1409f7d8ee5841
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z

RUN apk add --no-cache ca-certificates curl tar

WORKDIR /build

RUN curl \
      --fail \
      --location \
      --proto '=https' \
      --show-error \
      --silent \
      "https://github.com/minio/minio/archive/${MINIO_SOURCE_COMMIT}.tar.gz" \
      --output /tmp/minio-source.tar.gz \
    && printf '%s  %s\n' "$MINIO_SOURCE_SHA256" /tmp/minio-source.tar.gz \
      | sha256sum -c - \
    && tar \
      --extract \
      --gzip \
      --file /tmp/minio-source.tar.gz \
      --strip-components=1 \
    && rm /tmp/minio-source.tar.gz

RUN CGO_ENABLED=0 GOOS=linux GOARCH="$(go env GOARCH)" \
    go build \
      -buildvcs=false \
      -tags kqueue \
      -trimpath \
      -ldflags="-s -w \
        -X github.com/minio/minio/cmd.Version=2025-10-15T17:29:55Z \
        -X github.com/minio/minio/cmd.CopyrightYear=2025 \
        -X github.com/minio/minio/cmd.ReleaseTag=${MINIO_RELEASE} \
        -X github.com/minio/minio/cmd.CommitID=${MINIO_SOURCE_COMMIT} \
        -X github.com/minio/minio/cmd.ShortCommitID=9e49d5e7a648" \
      -o /out/minio \
      .

FROM alpine:3.24@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

RUN apk add --no-cache ca-certificates \
    && addgroup -g 1000 -S minio \
    && adduser -u 1000 -S -D -H -G minio minio \
    && mkdir -p /data \
    && chown 1000:1000 /data

COPY --from=builder --chown=1000:1000 /out/minio /usr/local/bin/minio
COPY --chown=1000:1000 entrypoint.sh /usr/local/bin/admin-promptube-object-storage-entrypoint

USER 1000:1000

EXPOSE 9000 9001

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=10 \
  CMD wget --quiet --spider http://127.0.0.1:9000/minio/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/admin-promptube-object-storage-entrypoint"]
CMD ["server", "/data", "--address", ":9000", "--console-address", ":9001"]
